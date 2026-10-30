import os
from typing import List
from pydantic_settings import BaseSettings

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
    ROBOFLOW_API_KEY: str = os.getenv("ROBOFLOW_API_KEY", "DUk7u9fEH6zkmpdD7NNw")
    ROBOFLOW_WORKFLOW_URL: str = os.getenv(
        "ROBOFLOW_WORKFLOW_URL",
        "https://serverless.roboflow.com/himanshu-kumar-jfult/workflows/cctv-gun-and-knife-video-review-1793338581900"
    )
    USE_ROBOFLOW_WEAPON_API: bool = True

    # AI Pipeline Tuning defaults (from Section 9.2)
    WEAPON_CONFIDENCE_THRESHOLD: float = 0.50
    WEAPON_MIN_FRAMES_IN_LAST_5: int = 3
    WEAPON_COOLDOWN_SECONDS: int = 30
    
    FIGHT_CONFIDENCE_THRESHOLD: float = 0.60
    FIGHT_WINDOW_SECONDS: float = 2.0
    FIGHT_COOLDOWN_SECONDS: int = 10
    
    UNATTENDED_BAG_RADIUS_PX: int = 150
    UNATTENDED_BAG_TIME_SECONDS: int = 60
    
    CROWD_OVERCROWDING_THRESHOLD: int = 15
    CROWD_DURATION_SECONDS: int = 10

    class Config:
        case_sensitive = True

settings = Settings()

