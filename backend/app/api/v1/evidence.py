import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import Evidence, User
from app.api.deps import require_operator

router = APIRouter(prefix="/evidence", tags=["evidence"])

@router.get("/{evidence_id}")
def get_evidence_file(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator)
):
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence or not os.path.exists(evidence.path):
        raise HTTPException(status_code=404, detail="Evidence file not found")
    
    media_type = "video/mp4" if evidence.kind == "clip" else "image/jpeg"
    return FileResponse(evidence.path, media_type=media_type)

