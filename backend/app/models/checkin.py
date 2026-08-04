from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Checkin(Base):
    __tablename__ = "checkins"

    id: Mapped[int] = mapped_column(primary_key=True)
    member_id: Mapped[int | None] = mapped_column(ForeignKey("members.id"), nullable=True)
    member_code: Mapped[str | None] = mapped_column(String(20), default="")
    scanned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    branch: Mapped[str | None] = mapped_column(String(120), default="", index=True)
    result: Mapped[str | None] = mapped_column(String(20))
    notes: Mapped[str | None] = mapped_column(Text, default="")
