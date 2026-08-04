from sqlalchemy import Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class MembershipType(Base):
    __tablename__ = "membership_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40), unique=True)
    duration_days: Mapped[int] = mapped_column(default=30)
    price: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    description: Mapped[str | None] = mapped_column(String(255), default="")
