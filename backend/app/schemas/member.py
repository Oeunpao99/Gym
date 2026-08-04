from datetime import date

from app.schemas.common import ORMModel


class MemberCreate(ORMModel):
    name: str
    email: str | None = ""
    phone: str | None = ""
    membership_type: str
    join_date: date | None = None
    remarks: str | None = ""
    photo_url: str | None = ""
    member_code: str | None = None
    branch: str | None = None
    promotion_id: int | None = None
    status: str | None = None
    allow_direct_approval: bool = False


class MemberUpdate(ORMModel):
    member_code: str | None = None
    name: str
    email: str | None = ""
    phone: str | None = ""
    membership_type: str
    join_date: date | None = None
    expiry_date: date | None = None
    days_left: int | None = 0
    status: str | None = None
    remarks: str | None = ""
    photo_url: str | None = ""
    branch: str | None = None
    promotion_id: int | None = None
    promotion_applied: str | None = ""


class MemberOut(ORMModel):
    id: int
    member_code: str
    name: str
    email: str | None = ""
    phone: str | None = ""
    membership_type: str
    join_date: date | None = None
    expiry_date: date | None = None
    days_left: int
    status: str
    remarks: str | None = ""
    photo_url: str | None = ""
    branch: str | None = None
    promotion_id: int | None = None
    promotion_applied: str | None = None
