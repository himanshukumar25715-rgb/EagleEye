import os
import shutil
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import Source, Job, JobStatus, User, AuditLog
from app.schemas import SourceResponse, JobResponse
from app.api.deps import get_current_user, require_operator
from app.core.config import settings
from app.services.job_worker import queue_video_job, cancel_job
from pydantic import BaseModel
import time

router = APIRouter(prefix="/sources", tags=["sources"])

@router.get("", response_model=List[SourceResponse])
def list_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Source).order_by(Source.created_at.desc()).all()

@router.post("", response_model=SourceResponse)
def create_source(
    name: str = Form(...),
    location_label: str = Form(...),
    source_type: str = Form("video_file"),
    rtsp_uri: Optional[str] = Form(None),
    auto_start: bool = Form(True),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator)
):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    if source_type == "video_file":
        if not file:
            raise HTTPException(status_code=400, detail="Video file must be provided for video_file type")
        
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".mp4", ".avi", ".mkv", ".mov"]:
            raise HTTPException(status_code=400, detail="Unsupported video format. Allowed: .mp4, .avi, .mkv, .mov")
        
        saved_filename = f"{uuid.uuid4().hex}{ext}"
        saved_path = os.path.join(settings.UPLOAD_DIR, saved_filename)
        
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        path_or_uri = saved_path
    else:
        if not rtsp_uri:
            raise HTTPException(status_code=400, detail="rtsp_uri must be provided for RTSP feed")
        path_or_uri = rtsp_uri

    source = Source(
        name=name,
        type=source_type,
        location_label=location_label,
        path_or_uri=path_or_uri,
        created_by=current_user.id
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    job = Job(source_id=source.id, status=JobStatus.QUEUED.value)
    db.add(job)
    
    audit = AuditLog(
        user_id=current_user.id,
        action="upload_source",
        entity="source",
        entity_id=str(source.id)
    )
    db.add(audit)
    db.commit()
    db.refresh(job)

    if auto_start:
        queue_video_job(job.id)

    return source

@router.post("/batch")
def create_sources_batch(
    files: List[UploadFile] = File(...),
    location_label: str = Form("Campus Perimeter"),
    auto_start: bool = Form(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator)
):
    """
    Upload one or multiple CCTV video footages simultaneously.
    Creates a Source and Job for each file, and optionally auto-starts AI analysis.
    """
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    created_sources = []

    for idx, f in enumerate(files):
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in [".mp4", ".avi", ".mkv", ".mov"]:
            continue

        saved_filename = f"{uuid.uuid4().hex}{ext}"
        saved_path = os.path.join(settings.UPLOAD_DIR, saved_filename)

        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(f.file, buffer)

        # Derive a readable camera name from filename
        clean_name = os.path.splitext(f.filename)[0].replace("_", " ").title()
        camera_name = f"Feed {clean_name}" if "video" in clean_name.lower() else clean_name
        camera_location = f"{location_label} - Cam {idx+1}" if len(files) > 1 else location_label

        source = Source(
            name=camera_name,
            type="video_file",
            location_label=camera_location,
            path_or_uri=saved_path,
            created_by=current_user.id
        )
        db.add(source)
        db.commit()
        db.refresh(source)

        job = Job(source_id=source.id, status=JobStatus.QUEUED.value)
        db.add(job)
        db.commit()
        db.refresh(job)

        if auto_start:
            queue_video_job(job.id)

        created_sources.append({
            "source_id": source.id,
            "job_id": job.id,
            "name": source.name,
            "location_label": source.location_label,
            "status": job.status
        })

    return {
        "message": f"Successfully ingested {len(created_sources)} CCTV footage files",
        "sources": created_sources
    }


class ConnectLiveCameraRequest(BaseModel):
    stream_url: str
    name: Optional[str] = None
    location_label: Optional[str] = None

@router.post("/{source_id}/connect-live")
def connect_live_camera(
    source_id: int,
    body: ConnectLiveCameraRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Camera channel not found")

    url = body.stream_url.strip()
    source.path_or_uri = url
    source.type = "rtsp" if url.startswith(("http", "rtsp")) else "webcam"
    if body.name:
        source.name = body.name
    if body.location_label:
        source.location_label = body.location_label
    db.commit()
    db.refresh(source)

    # Re-queue job
    cancel_job(source_id)
    time.sleep(0.3)
    queue_video_job(source_id)

    return {
        "message": f"Connected live camera to CAM-{source_id:02d} successfully!",
        "source": SourceResponse.from_orm(source)
    }

@router.post("/{source_id}/reset-sample")
def reset_sample_camera(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Camera channel not found")

    samples = {
        1: ("Main Entrance Gate 1", "Campus Gate 1 - North Boundary", "storage/uploads/sample_gate.mp4"),
        2: ("North Perimeter Walkway", "North Walkway - Sector B", "storage/uploads/sample_corridor.mp4"),
        3: ("Hostel Block A Lobby", "Hostel Block A - Ground Floor", "storage/uploads/sample_hostel.mp4"),
        4: ("Dining Hall Corridor", "Central Mess and Dining Wing", "storage/uploads/sample_hall.mp4"),
    }

    if source_id in samples:
        name, loc, path = samples[source_id]
        source.name = name
        source.location_label = loc
        source.path_or_uri = path
        source.type = "video_file"
        db.commit()

        cancel_job(source_id)
        time.sleep(0.3)
        queue_video_job(source_id)

    return {"message": f"Reset CAM-{source_id:02d} to default surveillance footage"}
