from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import decode_token
from app.models import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> User:
    # 1. Check Bearer token if provided
    if token:
        # Dev / prototype tokens
        if token in ["mock_admin_token"]:
            admin_user = db.query(User).filter(User.role == UserRole.ADMIN.value).first()
            if admin_user: return admin_user
        elif token in ["demo_token", "mock_operator_token"]:
            op_user = db.query(User).filter(User.role == UserRole.OPERATOR.value).first()
            if op_user: return op_user
        elif token in ["mock_viewer_token"]:
            view_user = db.query(User).filter(User.role == UserRole.VIEWER.value).first()
            if view_user: return view_user

        payload = decode_token(token)
        if payload and payload.get("type") == "access":
            user_id = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == int(user_id)).first()
                if user and user.is_active:
                    return user

    # 2. In Prototype / Development mode: fallback seamlessly to the default Operator user
    default_op = db.query(User).filter(User.role == UserRole.OPERATOR.value).first()
    if default_op:
        return default_op
    
    # Fallback to any active user
    first_user = db.query(User).first()
    if first_user:
        return first_user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )

def require_role(roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role '{current_user.role}'"
            )
        return current_user
    return role_checker

require_admin = require_role([UserRole.ADMIN.value])
require_operator = require_role([UserRole.ADMIN.value, UserRole.OPERATOR.value])
require_viewer = require_role([UserRole.ADMIN.value, UserRole.OPERATOR.value, UserRole.VIEWER.value])

