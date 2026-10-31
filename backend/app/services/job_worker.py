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
                img[:] = (18, 18, 18)
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
        is_stream_url = video_path.startswith(('http://', 'https://', 'rtsp://', 'rtmp://'))
        is_device_idx = video_path.isdigit()

        if is_device_idx:
            cap = cv2.VideoCapture(int(video_path))
        elif is_stream_url:
            cap = cv2.VideoCapture(video_path)
        else:
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

        # Target playback speed: 18-20 FPS smooth real-time streaming
        target_fps = min(float(source_fps), 20.0)
        frame_interval = 1.0 / target_fps

        # ML Inference interval: run YOLO every ~0.4s (2-3 inferences/sec) to keep CPU fast and smooth
        infer_interval = max(3, int(round(source_fps * 0.4)))

        os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)
        frame_idx = 0
        total_alerts_count = 0
        start_time = time.time()
        active_cancel_flags[job_id] = False

        cached_detections = {"persons": [], "bags": [], "weapons": [], "scuffle_bbox": None, "high_motion": False}
        cached_candidates = []

        while cap.isOpened():
            if active_cancel_flags.get(job_id, False):
                job.status = JobStatus.CANCELLED.value
                db.commit()
                break

            loop_start = time.time()
            ret, frame = cap.read()
            if not ret:
                # Seamless continuous CCTV loop for surveillance feeds
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                frame_idx = 0
                ret, frame = cap.read()
                if not ret:
                    cap.release()
                    cap = cv2.VideoCapture(video_path)
                    ret, frame = cap.read()
                    if not ret:
                        break

            frame_idx += 1
            current_timestamp = frame_idx / source_fps

            # Periodically run neural network detection & tracking (every ~0.4s)
            if frame_idx % infer_interval == 0:
                cached_detections, candidates = pipeline.detect_and_verify(
                    frame, frame_idx, source_fps, current_timestamp
                )
                cached_candidates = candidates

                # Record alerts & generate evidence snapshots
                for alert_data in candidates:
                    total_alerts_count += 1
                    evidence_filename = f"ev_{job_id}_{frame_idx}_{uuid.uuid4().hex[:8]}.jpg"
                    evidence_path = os.path.join(settings.EVIDENCE_DIR, evidence_filename)
                    cv2.imwrite(evidence_path, frame)
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

                    asyncio.run(ws_manager.broadcast({
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
                    }))

            # Rapid HUD & bounding box overlay (<0.5ms) on EVERY frame
            annotated_frame = pipeline.draw_hud(
                frame, cached_detections, cached_candidates, current_timestamp
            )

            # Store latest frame buffer for live MJPEG streaming
            _, buffer = cv2.imencode(".jpg", annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
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
                "processed_fps": round(target_fps, 1),
                "timestamp_sec": round(current_timestamp, 1),
                "alerts_count": total_alerts_count
            }

            # Periodic WS progress dispatch (every ~20 frames)
            if frame_idx % (infer_interval * 4) == 0:
                job.progress_pct = round(progress_pct, 1)
                job.processed_fps = round(target_fps, 1)
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

            # Dynamic pacing: sleep remaining frame interval for silky-smooth 20 FPS
            loop_elapsed = time.time() - loop_start
            sleep_needed = max(0.004, frame_interval - loop_elapsed)
            time.sleep(sleep_needed)

        cap.release()


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
