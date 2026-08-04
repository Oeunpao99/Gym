from sqlalchemy.orm import Session

from app.models.user import User
from app.security import create_access_token, verify_password


def authenticate(db: Session, username: str, password: str) -> User | None:
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


def issue_token(user: User) -> str:
    return create_access_token(
        {
            "sub": user.username,
            "uid": user.id,
            "name": user.name,
            "role": user.role.value,
            "branch": user.branch,
        }
    )
