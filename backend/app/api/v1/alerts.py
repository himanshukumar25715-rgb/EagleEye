import asyncio
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import Alert, AlertStatus, Evidence, Job, Source, User, AuditLog
from app.schemas import AlertResponse, AlertReviewRequest
from app.api.deps import get_current_user, require_operator
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    source_id: Optional[int] = Query(None),
    job_id: Optional[int] = Query(None),
    min_confidence: Optional[float] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Alert).join(Job).join(Source)
    
    if type:
        query = query.filter(Alert.type == type)
    if status:
        query = query.filter(Alert.status == status)
    if source_id:
        query = query.filter(Job.source_id == source_id)
    if job_id:
        query = query.filter(Alert.job_id == job_id)
    if min_confidence:
        query = query.filter(Alert.confidence >= min_confidence)
    
    alerts = query.order_by(Alert.created_at.desc()).offset(offset).limit(limit).all()

    # Hydrate source_name and location_label
    result = []
    for a in alerts:
        resp = AlertResponse.from_orm(a)
        if a.job and a.job.source:
            resp.source_name = a.job.source.name
            resp.location_label = a.job.source.location_label
        result.append(resp)
    return result

@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert_detail(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    resp = AlertResponse.from_orm(alert)
    if alert.job and alert.job.source:
        resp.source_name = alert.job.source.name
        resp.location_label = alert.job.source.location_label
    return resp

@router.patch("/{alert_id}", response_model=AlertResponse)
async def review_alert(
    alert_id: int,
    review_in: AlertReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.status = review_in.status
    alert.review_note = review_in.review_note
    alert.reviewed_by = current_user.id
    alert.reviewed_at = datetime.utcnow()
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action=f"review_alert_{review_in.status}",
        entity="alert",
        entity_id=str(alert.id)
    )
    db.add(audit)
    db.commit()
    db.refresh(alert)

    # Notify via WebSocket: alert.updated
    await ws_manager.broadcast({
        "event": "alert.updated",
        "data": {
            "alert_id": alert.id,
            "status": alert.status,
            "reviewed_by": current_user.name,
            "reviewed_at": alert.reviewed_at.isoformat()
        }
    })

    resp = AlertResponse.from_orm(alert)
    if alert.job and alert.job.source:
        resp.source_name = alert.job.source.name
        resp.location_label = alert.job.source.location_label
    return resp

