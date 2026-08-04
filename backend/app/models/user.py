from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import UserRole, str_enum


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[UserRole] = mapped_column(str_enum(UserRole, 30))
    # Free-text, matches "Downtown"/"Uptown"/"Head Office"/"All Branches" in the old USERS array.
    branch: Mapped[str | None] = mapped_column(String(120), default="")
