from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import ApprovalStatus, str_enum


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[int] = mapped_column(primary_key=True)
    member_id: Mapped[int | None] = mapped_column(ForeignKey("members.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str | None] = mapped_column(String(160), default="")
    phone: Mapped[str | None] = mapped_column(String(40), default="")
    request_type: Mapped[str] = mapped_column(String(40), default="New Member")
    membership_type: Mapped[str | None] = mapped_column(String(40))
    date: Mapped[date | None] = mapped_column(Date, nullable=True)
    branch: Mapped[str | None] = mapped_column(String(120), default="", index=True)
    status: Mapped[ApprovalStatus] = mapped_column(
        str_enum(ApprovalStatus, 30),
        default=ApprovalStatus.PENDING,
        index=True,
    )
    photo_url: Mapped[str | None] = mapped_column(Text, default="")
    promotion_id: Mapped[int | None] = mapped_column(ForeignKey("promotions.id"), nullable=True)
    promotion_applied: Mapped[str | None] = mapped_column(Text, nullable=True)
