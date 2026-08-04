from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse, UserOut
from app.services.auth_service import authenticate, issue_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate(db, payload.username, payload.password)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid login")
    token = issue_token(user)
    return TokenResponse(
        access_token=token,
        user=UserOut(username=user.username, name=user.name, role=user.role.value, branch=user.branch),
    )
