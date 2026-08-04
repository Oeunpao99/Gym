from datetime import date

from sqlalchemy import Date, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import PromotionStatus, str_enum


class Promotion(Base):
    __tablename__ = "promotions"

    id: Mapped[int] = mapped_column(primary_key=True)
    promotion_code: Mapped[str] = mapped_column(String(40), unique=True)
    promotion_name: Mapped[str] = mapped_column(String(120))
    base_duration_value: Mapped[int] = mapped_column(default=0)
    base_duration_unit: Mapped[str] = mapped_column(String(10), default="months")
    extra_duration_value: Mapped[int] = mapped_column(default=0)
    extra_duration_unit: Mapped[str] = mapped_column(String(10), default="days")
    package_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    applicable_membership_type: Mapped[str | None] = mapped_column(String(120), default="")
    usage_limit: Mapped[int] = mapped_column(default=0)
    used_count: Mapped[int] = mapped_column(default=0)
    status: Mapped[PromotionStatus] = mapped_column(
        str_enum(PromotionStatus, 20),
        default=PromotionStatus.INACTIVE,
    )
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
