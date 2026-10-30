import os
import cv2
import time
import json
import uuid
import asyncio
import threading
from typing import Dict, Generator, Any
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models import Job, Source, Alert, Evidence, JobStatus, AlertStatus, AlertType
from app.core.config import settings
from app.services.websocket_manager import ws_manager
from app.cv.pipeline import YOLO11SurveillancePipeline, calculate_sha256

# In-memory stores for active jobs, cancellation flags, and live streaming frames
active_cancel_flags: Dict[int, bool] = {}
latest_job_frames: Dict[int, bytes] = {}
latest_job_telemetry: Dict[int, Dict[str, Any]] = {}
active_threads: Dict[int, threading.Thread] = {}

def get_live_frame_generator(job_id: int) -> Generator[bytes, None, None]:
    """Generates MJPEG boundary frames for the web viewer in real-time"""
    placeholder = None
    while True:
        frame_bytes = latest_job_frames.get(job_id)
        if frame_bytes:
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
        else:
            if placeholder is None:
                import numpy as np
                img = np.zeros((360, 640, 3), dtype=np.uint8)
                img[:] = (14, 25, 18) # Dark green
                cv2.putText(img, f"Eagle Eye AI - CCTV Feed #{job_id}", (140, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 215, 255), 2)
                cv2.putText(img, "Initializing video analysis engine...", (150, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)
                _, buf = cv2.imencode(".jpg", img)
                placeholder = buf.tobytes()
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + placeholder + b"\r\n")
        time.sleep(0.05)  # ~20 fps streaming

def get_job_telemetry(job_id: int) -> Dict[str, Any]:
    return latest_job_telemetry.get(job_id, {
        "status": "idle",
        "persons": 0,
        "bags": 0,
        "alerts_count": 0,
        "current_fps": 0.0,
        "timestamp_sec": 0.0
    })

def cancel_job(job_id: int):
    active_cancel_flags[job_id] = True

def _run_job_thread(job_id: int):
    """
    Worker background thread:
    - Reads video frames paced at real-time CCTV playback speed (~15-20 FPS)
    - Runs YOLO11 detection + ByteTrack + 4 Security Event Logic Rules
    - Broadcasts live detections & alerts over WebSocket
    - Writes annotated video stream & saves evidence
    """
    db: Session = SessionLocal()
    pipeline = YOLO11SurveillancePipeline()

    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job or not job.source:
            return
        
        job.status = JobStatus.PROCESSING.value
        job.started_at = datetime.utcnow()
        job.error = None
        db.commit()

        # Send initial WS event
        ws_manager.broadcast_sync({
            "event": "job.progress",
            "data": {
                "job_id": job_id,
                "progress_pct": 0.0,
                "status": "processing",
                "source_name": job.source.name,
                "location_label": job.source.location_label
            }
        })

        video_path = job.source.path_or_uri
        if not os.path.exists(video_path):
            candidate_paths = [
                os.path.join(os.path.dirname(__file__), "..", "..", "..", video_path.lstrip("./\\")),
                os.path.join(os.path.dirname(__file__), "..", "..", video_path.lstrip("./\\")),
                os.path.join("backend", video_path.lstrip("./\\")),
                os.path.join(settings.STORAGE_DIR, os.path.basename(video_path)),
                os.path.join(settings.UPLOAD_DIR, os.path.basename(video_path)),
                os.path.join(os.path.dirname(__file__), "..", "..", "storage", "uploads", os.path.basename(video_path)),
                os.path.join("storage", "uploads", os.path.basename(video_path)),
                os.path.join("backend", "storage", "uploads", os.path.basename(video_path))
            ]
            for cp in candidate_paths:
                if os.path.exists(cp):
                    video_path = os.path.abspath(cp)
                    break

        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            job.status = JobStatus.FAILED.value
            job.error = f"Could not decode video file: {video_path}"
            db.commit()
            ws_manager.broadcast_sync({
                "event": "job.failed",
                "data": {"job_id": job_id, "error": job.error}
            })
            return

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0:
            total_frames = 1000

        source_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480

        # Sample rate: process every 1-2 frames to balance high accuracy with smooth playback
        sample_step = max(1, int(round(source_fps / 15.0))) # ~15 target analysis frames/sec

        os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)
        annotated_out_path = os.path.join(settings.STORAGE_DIR, f"annotated_job_{job_id}.mp4")
        
        # Output video writer for seekable review after job completes
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out_writer = cv2.VideoWriter(annotated_out_path, fourcc, 15.0, (width, height))

        frame_idx = 0
        total_alerts_count = 0
        start_time = time.time()
        active_cancel_flags[job_id] = False

        while cap.isOpened():
            if active_cancel_flags.get(job_id, False):
                job.status = JobStatus.CANCELLED.value
                db.commit()
                break

            loop_start = time.time()
            ret, frame = cap.read()
            if not ret:
                break

            frame_idx += 1
            if frame_idx % sample_step != 0:
                continue

            current_timestamp = frame_idx / source_fps

            # Run YOLO11 Detection, Tracking & Event Rules
            annotated_frame, candidates = pipeline.process_frame(
                frame, frame_idx, source_fps, current_timestamp
            )

            # Write to output annotated video
            if out_writer.isOpened():
                if annotated_frame.shape[1] != width or annotated_frame.shape[0] != height:
                    resized_for_writer = cv2.resize(annotated_frame, (width, height))
                    out_writer.write(resized_for_writer)
                else:
                    out_writer.write(annotated_frame)

            # Store latest frame buffer for live MJPEG streaming
            _, buffer = cv2.imencode(".jpg", annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
            latest_job_frames[job_id] = buffer.tobytes()

            # Record alerts & generate evidence snapshots
            for alert_data in candidates:
                total_alerts_count += 1
                evidence_filename = f"ev_{job_id}_{frame_idx}_{uuid.uuid4().hex[:8]}.jpg"
                evidence_path = os.path.join(settings.EVIDENCE_DIR, evidence_filename)
                cv2.imwrite(evidence_path, annotated_frame)
                sha256_hash = calculate_sha256(evidence_path)

                new_alert = Alert(
                    job_id=job_id,
                    type=alert_data["type"],
                    confidence=alert_data["confidence"],
                    status=AlertStatus.NEW.value,
                    frame_start=frame_idx,
                    frame_end=frame_idx,
                    ts_start=current_timestamp,
                    ts_end=current_timestamp,
                    track_ids=str(alert_data.get("track_id", ""))
                )
                db.add(new_alert)
                db.commit()
                db.refresh(new_alert)

                evidence = Evidence(
                    alert_id=new_alert.id,
                    kind="frame",
                    path=evidence_path,
                    bbox_json=json.dumps(alert_data.get("bbox", [])),
                    sha256=sha256_hash
                )
                db.add(evidence)
                db.commit()

                # Broadcast instant alert notification over WebSocket
                ws_manager.broadcast_sync({
                    "event": "alert.created",
                    "data": {
                        "id": new_alert.id,
                        "job_id": job_id,
                        "type": new_alert.type,
                        "confidence": new_alert.confidence,
                        "source_name": job.source.name,
                        "location_label": job.source.location_label,
                        "created_at": new_alert.created_at.isoformat(),
                        "ts_start": round(current_timestamp, 1)
                    }
                })

                # Play non-blocking OS audio alert sound upon incident transmission
                try:
                    import winsound
                    winsound.MessageBeep(winsound.MB_ICONEXCLAMATION)
                except Exception:
                    pass

            # Compute progress & FPS
            progress_pct = min(100.0, (frame_idx / total_frames) * 100.0)
            elapsed = max(0.001, time.time() - start_time)
            processed_fps = round(frame_idx / elapsed, 1)

            latest_job_telemetry[job_id] = {
                "status": "processing",
                "progress_pct": round(progress_pct, 1),
                "processed_fps": processed_fps,
                "timestamp_sec": round(current_timestamp, 1),
                "alerts_count": total_alerts_count
            }

            # Periodic WS progress dispatch (every ~10 processed frames)
            if frame_idx % (sample_step * 5) == 0:
                job.progress_pct = round(progress_pct, 1)
                job.processed_fps = processed_fps
                db.commit()

                ws_manager.broadcast_sync({
                    "event": "job.progress",
                    "data": {
                        "job_id": job_id,
                        "progress_pct": job.progress_pct,
                        "processed_fps": job.processed_fps,
                        "timestamp_sec": round(current_timestamp, 1),
                        "status": "processing",
                        "alerts_count": total_alerts_count
                    }
                })

            # Real-time CCTV Playback Pacing:
            # Pace the loop so the user watches the video run smoothly at realistic speed (~18 FPS)
            loop_elapsed = time.time() - loop_start
            sleep_needed = max(0.01, (1.0 / 18.0) - loop_elapsed)
            time.sleep(sleep_needed)

        cap.release()
        if out_writer.isOpened():
            out_writer.release()

        if job.status != JobStatus.CANCELLED.value:
            job.status = JobStatus.COMPLETED.value
            job.progress_pct = 100.0
            job.finished_at = datetime.utcnow()
            db.commit()

            ws_manager.broadcast_sync({
                "event": "job.completed",
                "data": {"job_id": job_id, "status": "completed"}
            })

    except Exception as e:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = JobStatus.FAILED.value
            job.error = str(e)
            db.commit()
            ws_manager.broadcast_sync({
                "event": "job.failed",
                "data": {"job_id": job_id, "error": str(e)}
            })
    finally:
        active_cancel_flags.pop(job_id, None)
        active_threads.pop(job_id, None)
        db.close()

def queue_video_job(job_id: int):
    """Starts or enqueues a video processing worker thread"""
    if job_id in active_threads and active_threads[job_id].is_alive():
        return
    t = threading.Thread(target=_run_job_thread, args=(job_id,), daemon=True)
    active_threads[job_id] = t
    t.start()
