import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import User, Report, ReportStatus
from app.api.deps import get_current_user
from app.schemas import (
    ReportResponse,
    SendReportRequest,
    ReportConfigRequest,
    ReportConfigResponse,
)
from app.services.email_service import (
    generate_report_data,
    render_report_html,
    send_and_save_report,
    send_email_smtp,
)
from app.services.report_scheduler import scheduler
from app.core.config import settings

logger = logging.getLogger("eagle_eye.reports_api")
router = APIRouter(prefix="/reports", tags=["reports"])


class TestEmailRequest(BaseModel):
    recipient_email: Optional[EmailStr] = None


@router.get("/preview")
def preview_report(
    period: str = Query("day", pattern="^(day|week|month)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns live aggregated surveillance report data and rendered HTML preview for Day, Week, or Month.
    """
    data = generate_report_data(db, period=period)
    html = render_report_html(data)
    return {
        "status": "success",
        "period": period,
        "data": data,
        "html_preview": html
    }


@router.post("/send", response_model=ReportResponse)
def send_report(
    req: SendReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates and immediately delivers the End of Day, Weekly, or Monthly report to the specified email address via Gmail SMTP.
    """
    to_email = req.recipient_email or settings.REPORT_DEFAULT_RECIPIENT or settings.SMTP_USER
    try:
        report = send_and_save_report(db, period=req.period, recipient_email=to_email)
        return report
    except Exception as exc:
        logger.error(f"Failed to generate and email report: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email report via SMTP: {str(exc)}"
        )


@router.get("/history", response_model=List[ReportResponse])
def get_report_history(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists historical generated and dispatched reports.
    """
    reports = db.query(Report).order_by(Report.created_at.desc()).limit(limit).all()
    return reports


@router.get("/config", response_model=ReportConfigResponse)
def get_report_config(
    current_user: User = Depends(get_current_user)
):
    """
    Returns the current configuration for automated End-of-Day report dispatch.
    """
    cfg = scheduler.get_config()
    return ReportConfigResponse(
        auto_enabled=cfg["auto_enabled"],
        default_recipient=cfg["default_recipient"],
        scheduled_hour=cfg["scheduled_hour"],
        scheduled_minute=cfg["scheduled_minute"],
        smtp_host=cfg["smtp_host"],
        smtp_port=cfg["smtp_port"],
        smtp_user=cfg["smtp_user"],
        from_name=cfg["from_name"],
    )


@router.put("/config", response_model=ReportConfigResponse)
def update_report_config(
    req: ReportConfigRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Updates the automated End-of-Day report dispatch schedule and recipient.
    """
    scheduler.update_config(
        auto_enabled=req.auto_enabled,
        scheduled_hour=req.scheduled_hour,
        scheduled_minute=req.scheduled_minute,
        default_recipient=req.default_recipient
    )
    return get_report_config(current_user=current_user)


@router.post("/test-smtp")
def test_smtp_connection(
    req: TestEmailRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Sends a test verification email to confirm that SMTP credentials and delivery are operating properly.
    """
    to_email = req.recipient_email or settings.REPORT_DEFAULT_RECIPIENT or settings.SMTP_USER
    test_html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background-color: #f8fafc;">
        <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
            <div style="display: inline-block; background-color: #0047ab; color: #ffffff; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px;">
                Eagle Eye AI Surveillance
            </div>
            <h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 18px;">SMTP Connection Verified</h2>
            <p style="color: #475569; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">
                Your Eagle Eye Gmail SMTP credentials have connected successfully. Automated end-of-the-day, weekly, and monthly security surveillance digests will be dispatched from this channel.
            </p>
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 12px; font-size: 12px; color: #334155; line-height: 1.6;">
                <strong>Host:</strong> {settings.SMTP_HOST}:{settings.SMTP_PORT}<br>
                <strong>Sender:</strong> {settings.SMTP_FROM_NAME} &lt;{settings.SMTP_USER}&gt;<br>
                <strong>Recipient:</strong> {to_email}<br>
                <strong>Status:</strong> Active & Ready
            </div>
        </div>
    </div>
    """
    try:
        send_email_smtp(
            to_email=to_email,
            subject="Eagle Eye AI - SMTP Verification Connection Successful",
            html_content=test_html,
            text_content="Eagle Eye AI - SMTP Verification Connection Successful."
        )
        return {"status": "success", "message": f"Test email sent successfully to {to_email}"}
    except Exception as exc:
        logger.error(f"SMTP verification test failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SMTP verification test failed: {str(exc)}"
        )
