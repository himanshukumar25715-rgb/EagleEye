from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr

# Auth & User Schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    name: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    type: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    last_login: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True

# Source Schemas
class SourceBase(BaseModel):
    name: str
    type: str = "video_file" # video_file or rtsp
    location_label: str

class SourceCreate(SourceBase):
    path_or_uri: Optional[str] = None

class SourceResponse(SourceBase):
    id: int
    path_or_uri: str
    created_by: Optional[int] = None
    created_at: datetime
    class Config:
        from_attributes = True

# Job Schemas
class JobResponse(BaseModel):
    id: int
    source_id: int
    status: str
    progress_pct: float
    processed_fps: float
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: datetime
    source_name: Optional[str] = None
    source_location: Optional[str] = None
    class Config:
        from_attributes = True

# Evidence Schemas
class EvidenceResponse(BaseModel):
    id: int
    alert_id: int
    kind: str
    path: str
    bbox_json: Optional[str] = None
    sha256: str
    created_at: datetime
    class Config:
        from_attributes = True

# Alert Schemas
class AlertBase(BaseModel):
    job_id: int
    type: str
    confidence: float
    status: str = "new"
    frame_start: Optional[int] = None
    frame_end: Optional[int] = None
    ts_start: Optional[float] = None
    ts_end: Optional[float] = None
    track_ids: Optional[str] = None

class AlertReviewRequest(BaseModel):
    status: str # confirmed, false_alarm, escalated, closed
    review_note: Optional[str] = None

class AlertResponse(AlertBase):
    id: int
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    review_note: Optional[str] = None
    created_at: datetime
    evidence_items: List[EvidenceResponse] = []
    source_id: Optional[int] = None
    source_name: Optional[str] = None
    location_label: Optional[str] = None
    class Config:
        from_attributes = True

# Settings Schemas
class SettingItem(BaseModel):
    key: str
    value_json: str
    scope: str = "global"

class SettingResponse(SettingItem):
    id: int
    updated_at: datetime
    class Config:
        from_attributes = True

# Analytics Summary Schema
class AnalyticsSummary(BaseModel):
    total_alerts: int
    alerts_today: int
    pending_review: int
    confirmed_alerts: int
    false_alarm_rate: float
    avg_review_time_mins: float
    alerts_by_type: dict
    alerts_by_hour: dict
    alerts_by_source: dict

# Audit Log Schema
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    entity: str
    entity_id: Optional[str] = None
    ip: Optional[str] = None
    timestamp: datetime
    class Config:
        from_attributes = True


# Report Schemas
class ReportResponse(BaseModel):
    id: int
    report_type: str
    title: str
    period_start: datetime
    period_end: datetime
    recipient_email: Optional[str] = None
    status: str
    total_alerts: int
    summary_json: Optional[str] = None
    html_content: Optional[str] = None
    error_message: Optional[str] = None
    sent_at: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True

class SendReportRequest(BaseModel):
    period: str = "day" # day, week, month
    recipient_email: Optional[EmailStr] = None

class ReportConfigRequest(BaseModel):
    auto_enabled: bool
    default_recipient: EmailStr
    scheduled_hour: int
    scheduled_minute: int

class ReportConfigResponse(BaseModel):
    auto_enabled: bool
    default_recipient: str
    scheduled_hour: int
    scheduled_minute: int
    smtp_host: str
    smtp_port: int
    smtp_user: str
    from_name: str
