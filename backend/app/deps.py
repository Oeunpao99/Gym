from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.models.enums import UserRole
from app.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


@dataclass
class CurrentUser:
    id: int
    username: str
    name: str
    role: UserRole
    branch: str | None


def get_current_user(token: str | None = Depends(oauth2_scheme)) -> CurrentUser:
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    return CurrentUser(
        id=payload["uid"],
        username=payload["sub"],
        name=payload["name"],
        role=UserRole(payload["role"]),
        branch=payload.get("branch"),
    )


def get_optional_user(token: str | None = Depends(oauth2_scheme)) -> CurrentUser | None:
    """Like get_current_user, but returns None instead of 401 when no/invalid token is
    present - for endpoints the public kiosk/card pages must reach without logging in,
    while still branch-scoping results for authenticated Branch Managers."""
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    return CurrentUser(
        id=payload["uid"],
        username=payload["sub"],
        name=payload["name"],
        role=UserRole(payload["role"]),
        branch=payload.get("branch"),
    )


def require_approver(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role not in (UserRole.HEAD_OFFICE, UserRole.CEO):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Head Office approval is required")
    return user


def is_branch_manager(user: CurrentUser) -> bool:
    return user.role == UserRole.BRANCH_MANAGER
