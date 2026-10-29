from datetime import datetime
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(tags=["health"])

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.utcnow().isoformat()
    }

