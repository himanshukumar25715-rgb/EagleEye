import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
from app.models import User, UserRole, Source, Job, Alert, AlertStatus, Evidence
from app.core.security import get_password_hash
from app.services.websocket_manager import ws_manager

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

# Ensure storage directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)

# Create database tables
Base.metadata.create_all(bind=engine)

def seed_initial_data():
    db = SessionLocal()
    try:
        # Seed default users matching Section 10.2: Admin, Operator, Viewer
        if not db.query(User).filter(User.email == "admin@eagleeye.edu").first():
            admin = User(
                name="Security Administrator",
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

            # Seed sample source & alert for initial dashboard preview
            demo_source = Source(
                name="Main Entrance Gate 1",
                type="video_file",
                location_label="Campus Gate 1 - North Boundary",
                path_or_uri="./storage/sample_gate.mp4",
                created_by=admin.id
            )
            db.add(demo_source)
            db.commit()
            db.refresh(demo_source)

            demo_job = Job(
                source_id=demo_source.id,
                status="completed",
                progress_pct=100.0,
                processed_fps=24.5
            )
            db.add(demo_job)
            db.commit()
            db.refresh(demo_job)

            # Sample alerts covering key types
            a1 = Alert(
                job_id=demo_job.id,
                type="weapon",
                confidence=0.89,
                status=AlertStatus.NEW.value,
                frame_start=120,
                frame_end=135,
                ts_start=4.8,
                ts_end=5.4,
                track_ids="TRK-104"
            )
            a2 = Alert(
                job_id=demo_job.id,
                type="unattended_object",
                confidence=0.94,
                status=AlertStatus.IN_REVIEW.value,
                frame_start=340,
                frame_end=450,
                ts_start=13.6,
                ts_end=18.0,
                track_ids="BAG-022"
            )
            a3 = Alert(
                job_id=demo_job.id,
                type="overcrowding",
                confidence=0.91,
                status=AlertStatus.CONFIRMED.value,
                frame_start=600,
                frame_end=720,
                ts_start=24.0,
                ts_end=28.8,
                track_ids="CROWD-G1"
            )
            a4 = Alert(
                job_id=demo_job.id,
                type="fight",
                confidence=0.78,
                status=AlertStatus.FALSE_ALARM.value,
                frame_start=800,
                frame_end=840,
                ts_start=32.0,
                ts_end=33.6,
                track_ids="TRK-201,TRK-202",
                review_note="Students greeting with handshake and hug"
            )
            db.add_all([a1, a2, a3, a4])
            db.commit()
    finally:
        db.close()

seed_initial_data()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend AI Surveillance Service for College & Hostel Security"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
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

