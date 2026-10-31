import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.db.session import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    OWNER = "owner"
    SECURITY_ROOM = "security_room"
    OPERATOR = "operator"
    VIEWER = "viewer"

class AlertStatus(str, enum.Enum):
    NEW = "new"
    IN_REVIEW = "in_review"
    CONFIRMED = "confirmed"
    FALSE_ALARM = "false_alarm"
    ESCALATED = "escalated"
    CLOSED = "closed"

class AlertType(str, enum.Enum):
    WEAPON = "weapon"
    FIGHT = "fight"
    UNATTENDED_OBJECT = "unattended_object"
    OVERCROWDING = "overcrowding"

class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ReportStatus(str, enum.Enum):
    GENERATED = "generated"
    SENT = "sent"
    FAILED = "failed"

class ReportType(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default=UserRole.VIEWER.value, nullable=False)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    type = Column(String(50), default="video_file") # video_file or rtsp
    location_label = Column(String(150), nullable=False) # e.g. Gate 1, Corridor C, Hostel Block A
    path_or_uri = Column(String(500), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    jobs = relationship("Job", back_populates="source", cascade="all, delete-orphan")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=False)
    status = Column(String(30), default=JobStatus.QUEUED.value)
    progress_pct = Column(Float, default=0.0)
    processed_fps = Column(Float, default=0.0)
    error = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    source = relationship("Source", back_populates="jobs")
    alerts = relationship("Alert", back_populates="job", cascade="all, delete-orphan")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    type = Column(String(50), nullable=False) # weapon, fight, unattended_object, overcrowding
    confidence = Column(Float, nullable=False)
    status = Column(String(30), default=AlertStatus.NEW.value)
    frame_start = Column(Integer, nullable=True)
    frame_end = Column(Integer, nullable=True)
    ts_start = Column(Float, nullable=True) # seconds in video
    ts_end = Column(Float, nullable=True)
    track_ids = Column(String(255), nullable=True) # comma-separated IDs
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="alerts")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    evidence_items = relationship("Evidence", back_populates="alert", cascade="all, delete-orphan")

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=False)
    kind = Column(String(20), nullable=False) # frame or clip
    path = Column(String(500), nullable=False)
    bbox_json = Column(Text, nullable=True) # json of boxes [[x1, y1, x2, y2, label, conf]]
    sha256 = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    alert = relationship("Alert", back_populates="evidence_items")

class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    scope = Column(String(50), default="global") # global or source
    key = Column(String(100), unique=True, nullable=False)
    value_json = Column(Text, nullable=False)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False) # e.g. login, review_alert, change_setting
    entity = Column(String(50), nullable=False)  # alert, source, setting, user
    entity_id = Column(String(50), nullable=True)
    ip = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    report_type = Column(String(50), nullable=False) # daily, weekly, monthly
    title = Column(String(200), nullable=False)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    recipient_email = Column(String(120), nullable=True)
    status = Column(String(30), default="generated") # generated, sent, failed
    total_alerts = Column(Integer, default=0)
    summary_json = Column(Text, nullable=True)
    html_content = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
