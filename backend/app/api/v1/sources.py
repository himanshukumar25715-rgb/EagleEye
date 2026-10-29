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
from app.services.job_worker import queue_video_job

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
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator)
):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    if source_type == "video_file":
        if not file:
            raise HTTPException(status_code=400, detail="Video file must be provided for video_file type")
        
        # Security: sanitize filename and store with UUID
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

    # Create associated processing Job
    job = Job(source_id=source.id, status=JobStatus.QUEUED.value)
    db.add(job)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="upload_source",
        entity="source",
        entity_id=str(source.id)
    )
    db.add(audit)
    db.commit()
    db.refresh(job)

    # Asynchronously dispatch to job processor
    queue_video_job(job.id)

    return source

