import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import Setting, User, AuditLog
from app.schemas import SettingItem, SettingResponse
from app.api.deps import require_admin, get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])

DEFAULT_SETTINGS = {
    "weapon_confidence": "0.50",
    "weapon_cooldown_sec": "30",
    "fight_confidence": "0.60",
    "fight_cooldown_sec": "10",
    "unattended_bag_radius_px": "150",
    "unattended_bag_seconds": "60",
    "crowd_threshold": "15",
    "crowd_duration_sec": "10",
    "video_retention_days": "30",
    "evidence_retention_days": "90"
}

@router.get("", response_model=List[SettingResponse])
def get_settings(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    # Initialize defaults if not present
    existing = db.query(Setting).all()
    existing_keys = {s.key for s in existing}
    
    for k, v in DEFAULT_SETTINGS.items():
        if k not in existing_keys:
            setting = Setting(scope="global", key=k, value_json=json.dumps(v))
            db.add(setting)
    db.commit()

    return db.query(Setting).all()

@router.put("", response_model=SettingResponse)
def update_setting(
    item: SettingItem,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    setting = db.query(Setting).filter(Setting.key == item.key).first()
    if not setting:
        setting = Setting(scope=item.scope, key=item.key, value_json=item.value_json, updated_by=current_user.id)
        db.add(setting)
    else:
        setting.value_json = item.value_json
        setting.updated_by = current_user.id
    
    audit = AuditLog(
        user_id=current_user.id,
        action=f"update_setting_{item.key}",
        entity="setting",
        entity_id=item.key
    )
    db.add(audit)
    db.commit()
    db.refresh(setting)
    return setting

