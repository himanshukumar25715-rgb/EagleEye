import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
from app.models import User, UserRole, Source, Job, Alert, AlertStatus, Evidence, Report
from app.core.security import get_password_hash
from app.services.websocket_manager import ws_manager
from app.services.report_scheduler import scheduler

# Import API routes
from app.api.v1.auth import router as auth_router
from app.api.v1.sources import router as sources_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.evidence import router as evidence_router
from app.api.v1.settings import router as settings_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.audit import router as audit_router
from app.api.v1.health import router as health_router
from app.api.v1.reports import router as reports_router

# Ensure storage directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)

# Create database tables
Base.metadata.create_all(bind=engine)

def seed_initial_data():
    db = SessionLocal()
    try:
        # Seed default users matching Section 10.2: Admin, Operator, Viewer
        admin = db.query(User).filter(User.email == "admin@eagleeye.edu").first()
        if not admin:
            admin = User(
                name="College Admin",
                email="admin@eagleeye.edu",
                password_hash=get_password_hash("admin123"),
                role=UserRole.ADMIN.value
            )
            operator = User(
                name="Desk Operator (Ctrl+Shift+Go)",
                email="operator@eagleeye.edu",
                password_hash=get_password_hash("operator123"),
                role=UserRole.OPERATOR.value
            )
            viewer = User(
                name="Staff Viewer",
                email="viewer@eagleeye.edu",
                password_hash=get_password_hash("viewer123"),
                role=UserRole.VIEWER.value
            )
            db.add_all([admin, operator, viewer])
            db.commit()
            db.refresh(admin)

        # Ensure College Admin, Owner, and Security Room 1 profiles are always seeded
        institutional_profiles = [
            ("College Admin", "college.admin@eagleeye.edu", "admin123", UserRole.ADMIN.value),
            ("Owner", "owner@eagleeye.edu", "owner123", UserRole.ADMIN.value),
            ("Security Room 1", "security.room1@eagleeye.edu", "security123", UserRole.OPERATOR.value),
        ]
        for name, email, pw, role in institutional_profiles:
            if not db.query(User).filter(User.email == email).first():
                db.add(User(
                    name=name,
                    email=email,
                    password_hash=get_password_hash(pw),
                    role=role,
                    is_active=True
                ))
        db.commit()

        # 4 Core Camera Sources configured per user requirements:
        # CAM-01: Default live phone camera
        # CAM-02: Submitted fight incident detection video
        # CAM-03 & CAM-04: Default campus surveillance videos
        sample_cameras = [
            (1, "CAM-01 (Live Phone Camera)", "Live Mobile Demo Stream", "http://192.168.137.22:8080/video"),
            (2, "CAM-02 (Fight Video)", "North Perimeter Walkway", "storage/uploads/fight_0001.mp4"),
            (3, "Hostel Block A Lobby", "Hostel Block A - Ground Floor", "storage/uploads/sample_hostel.mp4"),
            (4, "CAM-04 (Demo 3)", "Campus Security Zone", "D:/sanchay/EagleEye/backend/storage/uploads/demo3.mp4"),
        ]

        for s_id, s_name, s_loc, s_path in sample_cameras:
            src = db.query(Source).filter(Source.id == s_id).first()
            if not src:
                src = Source(
                    id=s_id,
                    name=s_name,
                    type="video_file",
                    location_label=s_loc,
                    path_or_uri=s_path,
                    created_by=admin.id
                )
                db.add(src)
                db.commit()
                db.refresh(src)
            else:
                src.name = s_name
                src.location_label = s_loc
                src.path_or_uri = s_path
                db.commit()

            j = db.query(Job).filter(Job.id == s_id).first()
            if not j:
                j = Job(
                    id=s_id,
                    source_id=s_id,
                    status="pending",
                    progress_pct=0.0,
                    processed_fps=0.0
                )
                db.add(j)
                db.commit()
    finally:
        db.close()

seed_initial_data()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend AI Surveillance Service for College & Hostel Security"
)

# CORS setup - supports any local dev port
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST Routers
app.include_router(health_router, prefix="")
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(sources_router, prefix=settings.API_V1_STR)
app.include_router(jobs_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(evidence_router, prefix=settings.API_V1_STR)
app.include_router(settings_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)

# Start automated report background scheduler and live video processing jobs
@app.on_event("startup")
def on_startup():
    scheduler.start()
    # Auto-start video processing pipeline for active camera channels
    from app.services.job_worker import queue_video_job
    for job_id in [1, 2, 3, 4]:
        queue_video_job(job_id)

# Real-time WebSocket endpoint (/ws/alerts)
@app.websocket("/ws/alerts")
async def websocket_alerts_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep-alive loop or incoming client pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
