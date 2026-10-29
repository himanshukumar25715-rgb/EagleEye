from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import AuditLog, User
from app.schemas import AuditLogResponse
from app.api.deps import require_admin

router = APIRouter(prefix="/audit", tags=["audit"])

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
    results = []
    for l in logs:
        resp = AuditLogResponse.from_orm(l)
        if l.user:
            resp.user_name = l.user.name
        results.append(resp)
    return results

