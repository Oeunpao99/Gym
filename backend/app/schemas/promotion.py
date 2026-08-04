from datetime import date

from app.schemas.common import ORMModel


class PromotionIn(ORMModel):
    promotion_code: str | None = None
    promotion_name: str
    base_duration_value: int = 0
    base_duration_unit: str = "months"
    extra_duration_value: int = 0
    extra_duration_unit: str = "days"
    package_price: float | None = None
    applicable_membership_type: str | None = ""
    usage_limit: int = 0
    used_count: int = 0
    status: str = "Active"
    start_date: date | None = None
    end_date: date | None = None


class PromotionOut(PromotionIn):
    id: int
