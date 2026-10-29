import os
import cv2
import time
import json
import uuid
import asyncio
import threading
from typing import Dict, Generator
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models import Job, Source, Alert, Evidence, JobStatus, AlertStatus, AlertType
from app.core.config import settings
from app.services.websocket_manager import ws_manager
from app.cv.pipeline import YOLO11SurveillancePipeline, calculate_sha256

# In-memory store for active job cancel flags and live MJPEG streams
active_cancel_flags: Dict[int, bool] = {}
latest_job_frames: Dict[int, bytes] = {}

def get_live_frame_generator(job_id: int) -> Generator[bytes, None, None]:
    """Generates MJPEG boundary frames for the web viewer"""
    placeholder = None
    while True:
        frame_bytes = latest_job_frames.get(job_id)
        if frame_bytes:
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
        else:
            if placeholder is None:
                # 640x360 dark banner frame
                import numpy as np
                img = np.zeros((360, 640, 3), dtype=np.uint8)
                img[:] = (18, 28, 18) # Dark green
                cv2.putText(img, f"Eagle Eye - Job #{job_id}", (160, 170), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 215, 255), 2)
                cv2.putText(img, "Waiting for stream / Processed", (180, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
                _, buf = cv2.imencode(".jpg", img)
                placeholder = buf.tobytes()
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + placeholder + b"\r\n")
        time.sleep(0.06)  # ~15 fps streaming

def cancel_job(job_id: int):
    active_cancel_flags[job_id] = True

def _run_job_thread(job_id: int):
    """Worker background thread that analyzes video and flags security events"""
    db: Session = SessionLocal()
    pipeline = YOLO11SurveillancePipeline()

    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return
        
        job.status = JobStatus.PROCESSING.value
        job.started_at = datetime.utcnow()
        db.commit()

        # Send WS event
        asyncio.run(ws_manager.broadcast({
            "event": "job.progress",
            "data": {"job_id": job_id, "progress_pct": 0.0, "status": "processing"}
        }))

        video_path = job.source.path_or_uri
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            job.status = JobStatus.FAILED.value
            job.error = "Could not open video file or RTSP stream"
            db.commit()
            asyncio.run(ws_manager.broadcast({
                "event": "job.failed",
                "data": {"job_id": job_id, "error": job.error}
            }))
            return

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0:
            total_frames = 1000 # default fallback for live/unknown

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        frame_idx = 0
        sample_step = max(1, int(fps // 8)) # sample ~8 frames per second (Section 9.4)

        os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)
        start_time = time.time()

        while cap.isOpened():
            if active_cancel_flags.get(job_id, False):
                job.status = JobStatus.CANCELLED.value
                db.commit()
                break

            ret, frame = cap.read()
            if not ret:
                break

            frame_idx += 1
            if frame_idx % sample_step != 0:
                continue

            current_timestamp = frame_idx / fps

            # Run CV pipeline
            annotated_frame, candidates = pipeline.process_frame(
                frame, frame_idx, fps, current_timestamp
            )

            # Store latest frame for MJPEG live viewing
            _, buffer = cv2.imencode(".jpg", annotated_frame)
            latest_job_frames[job_id] = buffer.tobytes()

            # Record candidate alerts & evidence if flagged
            for alert_data in candidates:
                # Save evidence frame
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

                # Broadcast real-time alert via WebSocket
                asyncio.run(ws_manager.broadcast({
                    "event": "alert.created",
                    "data": {
                        "id": new_alert.id,
                        "job_id": job_id,
                        "type": new_alert.type,
                        "confidence": new_alert.confidence,
                        "source_name": job.source.name,
                        "location_label": job.source.location_label,
                        "created_at": new_alert.created_at.isoformat()
                    }
                }))

            # Periodic progress update
            progress_pct = min(100.0, (frame_idx / total_frames) * 100.0)
            elapsed = max(0.001, time.time() - start_time)
            processed_fps = frame_idx / elapsed

            if frame_idx % (sample_step * 10) == 0:
                job.progress_pct = round(progress_pct, 1)
                job.processed_fps = round(processed_fps, 1)
                db.commit()

                asyncio.run(ws_manager.broadcast({
                    "event": "job.progress",
                    "data": {
                        "job_id": job_id,
                        "progress_pct": job.progress_pct,
                        "processed_fps": job.processed_fps,
                        "status": "processing"
                    }
                }))

        cap.release()

        if job.status != JobStatus.CANCELLED.value:
            job.status = JobStatus.COMPLETED.value
            job.progress_pct = 100.0
            job.finished_at = datetime.utcnow()
            db.commit()

            asyncio.run(ws_manager.broadcast({
                "event": "job.completed",
                "data": {"job_id": job_id, "status": "completed"}
            }))

    except Exception as e:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = JobStatus.FAILED.value
            job.error = str(e)
            db.commit()
            asyncio.run(ws_manager.broadcast({
                "event": "job.failed",
                "data": {"job_id": job_id, "error": str(e)}
            }))
    finally:
        active_cancel_flags.pop(job_id, None)
        db.close()

def queue_video_job(job_id: int):
    t = threading.Thread(target=_run_job_thread, args=(job_id,), daemon=True)
    t.start()

