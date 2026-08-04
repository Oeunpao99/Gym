from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import RenewalStatus, str_enum


class Renewal(Base):
    __tablename__ = "renewals"

    id: Mapped[int] = mapped_column(primary_key=True)
    member_id: Mapped[int | None] = mapped_column(ForeignKey("members.id"), nullable=True, index=True)
    member_code: Mapped[str | None] = mapped_column(String(20), default="")
    photo_url: Mapped[str | None] = mapped_column(Text, default="")
    request_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    processed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[RenewalStatus] = mapped_column(
        str_enum(RenewalStatus, 20),
        default=RenewalStatus.RENEWING,
        index=True,
    )
    bonus_days: Mapped[int | None] = mapped_column(default=0)
    remarks: Mapped[str | None] = mapped_column(Text, default="")
    previous_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    new_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    promotion_applied: Mapped[str | None] = mapped_column(Text, nullable=True)
    promotion_id: Mapped[int | None] = mapped_column(ForeignKey("promotions.id"), nullable=True)
    membership_type: Mapped[str | None] = mapped_column(String(40))
    approved_by: Mapped[str | None] = mapped_column(String(120), default="")
    branch: Mapped[str | None] = mapped_column(String(120), default="", index=True)
