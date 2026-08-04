from datetime import date

from app.schemas.common import ORMModel


class RenewalIn(ORMModel):
    member_id: int | None = None
    member_code: str | None = ""
    photo_url: str | None = ""
    request_date: date | None = None
    processed_date: date | None = None
    status: str | None = None
    bonus_days: int | None = 0
    remarks: str | None = ""
    previous_end_date: date | None = None
    new_end_date: date | None = None
    membership_type: str | None = None
    promotion_id: int | None = None
    promotion_applied: str | None = None
    approved_by: str | None = ""
    branch: str | None = None


class RenewalOut(ORMModel):
    id: int
    member_id: int | None = None
    member_code: str | None = ""
    photo_url: str | None = ""
    request_date: date | None = None
    processed_date: date | None = None
    status: str
    bonus_days: int | None = 0
    remarks: str | None = ""
    previous_end_date: date | None = None
    new_end_date: date | None = None
    membership_type: str | None = None
    promotion_id: int | None = None
    promotion_applied: str | None = None
    approved_by: str | None = ""
    branch: str | None = None


class RenewalProcessRequest(ORMModel):
    membership_type: str | None = None
    duration_days: int | None = None
    start_date: date | None = None
    promotion_id: int | None = None
    promotion_applied: str | None = None
    approved_by: str | None = None
    branch: str | None = None
