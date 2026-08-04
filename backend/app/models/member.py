from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import MemberStatus, str_enum


class Member(Base):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(primary_key=True)
    member_code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str | None] = mapped_column(String(160), default="")
    phone: Mapped[str | None] = mapped_column(String(40), default="")
    membership_type: Mapped[str] = mapped_column(String(40))
    join_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    days_left: Mapped[int] = mapped_column(default=0)
    status: Mapped[MemberStatus] = mapped_column(
        str_enum(MemberStatus, 30),
        default=MemberStatus.PENDING,
        index=True,
    )
    remarks: Mapped[str | None] = mapped_column(Text, default="")
    photo_url: Mapped[str | None] = mapped_column(Text, default="")
    # Free-text branch name/code, not a FK - matches the old app's storage and allows
    # values like "Front Desk" (scan default) that don't correspond to a managed branch row.
    branch: Mapped[str | None] = mapped_column(String(120), default="", index=True)
    promotion_id: Mapped[int | None] = mapped_column(ForeignKey("promotions.id"), nullable=True)
    promotion_applied: Mapped[str | None] = mapped_column(Text, nullable=True)
