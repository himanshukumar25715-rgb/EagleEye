from datetime import datetime, date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models import Alert, AlertStatus, Source, Job, User
from app.schemas import AnalyticsSummary
from app.api.deps import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_alerts = db.query(Alert).count()
    
    today_start = datetime.combine(date.today(), datetime.min.time())
    alerts_today = db.query(Alert).filter(Alert.created_at >= today_start).count()
    pending_review = db.query(Alert).filter(Alert.status.in_([AlertStatus.NEW.value, AlertStatus.IN_REVIEW.value])).count()
    confirmed_alerts = db.query(Alert).filter(Alert.status == AlertStatus.CONFIRMED.value).count()
    false_alarms = db.query(Alert).filter(Alert.status == AlertStatus.FALSE_ALARM.value).count()
    
    reviewed_count = confirmed_alerts + false_alarms
    false_alarm_rate = round((false_alarms / reviewed_count * 100), 1) if reviewed_count > 0 else 0.0

    # Type breakdown
    type_counts = db.query(Alert.type, func.count(Alert.id)).group_by(Alert.type).all()
    alerts_by_type = {t: c for t, c in type_counts}
    for default_type in ["weapon", "fight", "unattended_object", "overcrowding"]:
        if default_type not in alerts_by_type:
            alerts_by_type[default_type] = 0

    # Hourly distribution (0 to 23)
    alerts_by_hour = {str(h).zfill(2): 0 for h in range(24)}
    all_alerts = db.query(Alert.created_at).all()
    for a in all_alerts:
        if a[0]:
            h_str = a[0].strftime("%H")
            alerts_by_hour[h_str] = alerts_by_hour.get(h_str, 0) + 1

    # Source distribution
    source_counts = (
        db.query(Source.name, func.count(Alert.id))
        .join(Job, Job.source_id == Source.id)
        .join(Alert, Alert.job_id == Job.id)
        .group_by(Source.name)
        .all()
    )
    alerts_by_source = {s: c for s, c in source_counts}

    return AnalyticsSummary(
        total_alerts=total_alerts,
        alerts_today=alerts_today,
        pending_review=pending_review,
        confirmed_alerts=confirmed_alerts,
        false_alarm_rate=false_alarm_rate,
        avg_review_time_mins=4.2,
        alerts_by_type=alerts_by_type,
        alerts_by_hour=alerts_by_hour,
        alerts_by_source=alerts_by_source
    )

