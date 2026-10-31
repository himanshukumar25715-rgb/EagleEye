import os
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import Evidence, User
from app.api.deps import require_operator
from app.services.db2_vault import db2_vault

router = APIRouter(prefix="/evidence", tags=["evidence"])

@router.get("/db2/status")
def get_db2_vault_status(db: Session = Depends(get_db)):
    """Returns IBM Db2 Enterprise Forensic Vault status and cryptographic chain-of-custody health"""
    return db2_vault.get_vault_status(db)

@router.get("/db2/export.sql")
def export_db2_sql(db: Session = Depends(get_db)):
    """Generates and downloads executable IBM Db2 DML script for the IBM Db2 Developer Extension"""
    sql_content = db2_vault.generate_db2_dml_export(db)
    return Response(
        content=sql_content,
        media_type="application/sql",
        headers={"Content-Disposition": "attachment; filename=eagle_eye_db2_evidence_vault.sql"}
    )

@router.get("/{evidence_id}")
def get_evidence_file(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator)
):
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence or not os.path.exists(evidence.path):
        raise HTTPException(status_code=404, detail="Evidence file not found")
    
    media_type = "video/mp4" if evidence.kind == "clip" else "image/jpeg"
    return FileResponse(evidence.path, media_type=media_type)
