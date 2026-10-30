import os
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import Job, Source, JobStatus, User, AuditLog
from app.schemas import JobResponse
from app.api.deps import get_current_user, require_operator
from app.core.config import settings
from app.services.job_worker import cancel_job, get_live_frame_generator, queue_video_job, get_job_telemetry

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.get("/active", response_model=List[JobResponse])
def get_active_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns all currently active (processing or queued) surveillance jobs"""
    jobs = db.query(Job).filter(Job.status.in_([JobStatus.PROCESSING.value, JobStatus.QUEUED.value])).all()
    results = []
    for j in jobs:
        resp = JobResponse.from_orm(j)
        if j.source:
            resp.source_name = j.source.name
            resp.source_location = j.source.location_label
        results.append(resp)
    return results

@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    resp = JobResponse.from_orm(job)
    if job.source:
        resp.source_name = job.source.name
        resp.source_location = job.source.location_label
    return resp

@router.post("/{job_id}/start")
def start_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator)
):
    """Explicitly triggers or re-runs video analysis on a CCTV feed"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.status = JobStatus.QUEUED.value
    job.progress_pct = 0.0
    db.commit()

    queue_video_job(job.id)

    audit = AuditLog(
        user_id=current_user.id,
        action="start_job",
        entity="job",
        entity_id=str(job.id)
    )
    db.add(audit)
    db.commit()

    return {"detail": f"Job {job_id} analysis initiated"}

@router.post("/start-all")
def start_all_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator)
):
    """Starts AI analysis on all queued CCTV feeds simultaneously"""
    queued_jobs = db.query(Job).filter(Job.status == JobStatus.QUEUED.value).all()
    started = []
    for j in queued_jobs:
        queue_video_job(j.id)
        started.append(j.id)
    return {"detail": f"Started {len(started)} CCTV analysis pipelines", "job_ids": started}

@router.post("/{job_id}/cancel")
def cancel_job_endpoint(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator)
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    cancel_job(job_id)
    job.status = JobStatus.CANCELLED.value
    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="cancel_job",
        entity="job",
        entity_id=str(job.id)
    )
    db.add(audit)
    db.commit()

    return {"detail": f"Job {job_id} cancelled"}

@router.get("/{job_id}/stream")
def stream_mjpeg(job_id: int, db: Session = Depends(get_db)):
    """Annotated live MJPEG stream with real-time YOLO11 bounding overlays"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return StreamingResponse(
        get_live_frame_generator(job_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.get("/{job_id}/video")
def get_processed_video(
    job_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Serves the annotated MP4 (if generated) or source video with byte-range seek support"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job or not job.source:
        raise HTTPException(status_code=404, detail="Job or video source not found")
    
    annotated_path = os.path.join(settings.STORAGE_DIR, f"annotated_job_{job_id}.mp4")
    video_path = annotated_path if os.path.exists(annotated_path) else job.source.path_or_uri

    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found on disk")

    file_size = os.path.getsize(video_path)
    range_header = request.headers.get("range")

    if range_header:
        bytes_str = range_header.replace("bytes=", "").split("-")
        start = int(bytes_str[0])
        end = int(bytes_str[1]) if bytes_str[1] else file_size - 1
        length = end - start + 1

        def iter_file():
            with open(video_path, "rb") as f:
                f.seek(start)
                remaining = length
                while remaining > 0:
                    chunk_size = min(64 * 1024, remaining)
                    data = f.read(chunk_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(length),
            "Content-Type": "video/mp4",
        }
        return StreamingResponse(iter_file(), status_code=206, headers=headers)
    else:
        def iter_full_file():
            with open(video_path, "rb") as f:
                while chunk := f.read(64 * 1024):
                    yield chunk

        headers = {
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Content-Type": "video/mp4",
        }
        return StreamingResponse(iter_full_file(), headers=headers)
