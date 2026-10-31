import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load environment variables from .env (backend directory or project root)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

class Settings(BaseSettings):
    PROJECT_NAME: str = "Eagle Eye - Campus Surveillance AI"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "eagle-eye-super-secret-key-change-in-production-2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ALGORITHM: str = "HS256"
    
    # Fixed absolute SQLite database path so backend always finds eagle_eye.db regardless of working directory
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'eagle_eye.db').replace(os.sep, '/')}"
    )
    
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", "./storage")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./storage/uploads")
    EVIDENCE_DIR: str = os.getenv("EVIDENCE_DIR", "./storage/evidence")
    
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    
    # Roboflow CCTV Gun & Knife Inference Workflow
    ROBOFLOW_API_KEY: str = os.getenv("ROBOFLOW_API_KEY", "")
    ROBOFLOW_WORKFLOW_URL: str = os.getenv(
        "ROBOFLOW_WORKFLOW_URL",
        "https://serverless.roboflow.com/himanshu-kumar-jfult/workflows/cctv-gun-and-knife-video-review-1793338581900"
    )
    USE_ROBOFLOW_WEAPON_API: bool = True

    # AI Pipeline Tuning defaults (from Section 9.2)
    # AI Pipeline Tuning defaults (from Section 9.2)
    WEAPON_CONFIDENCE_THRESHOLD: float = 0.35
    WEAPON_MIN_FRAMES_IN_LAST_5: int = 2
    WEAPON_COOLDOWN_SECONDS: int = 10
    
    FIGHT_CONFIDENCE_THRESHOLD: float = 0.60
    FIGHT_WINDOW_SECONDS: float = 2.0
    FIGHT_COOLDOWN_SECONDS: int = 10
    
    UNATTENDED_BAG_RADIUS_PX: int = 180
    UNATTENDED_BAG_RADIUS_PIXELS: int = 180
    UNATTENDED_BAG_TIME_SECONDS: int = 60
    
    CROWD_OVERCROWDING_THRESHOLD: int = 8
    CROWD_DURATION_SECONDS: int = 6


    # SMTP & Automated Email Reporting (Loaded exclusively from .env)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "Eagle Eye Surveillance")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "")
    REPORT_DEFAULT_RECIPIENT: str = os.getenv("REPORT_DEFAULT_RECIPIENT", "")
    AUTO_REPORT_ENABLED: bool = os.getenv("AUTO_REPORT_ENABLED", "true").lower() in ("true", "1", "yes")
    AUTO_REPORT_HOUR: int = int(os.getenv("AUTO_REPORT_HOUR", "23"))
    AUTO_REPORT_MINUTE: int = int(os.getenv("AUTO_REPORT_MINUTE", "59"))

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()
