from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Walkin(Base):
    __tablename__ = "walkins"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str | None] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(40), default="")
    time: Mapped[str | None] = mapped_column(String(40), default="")
    purpose: Mapped[str | None] = mapped_column(String(255), default="")
    status: Mapped[str | None] = mapped_column(String(40), default="")
    converted: Mapped[bool] = mapped_column(Boolean, default=False)
