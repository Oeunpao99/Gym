from __future__ import annotations

from datetime import date as DateType

from app.schemas.common import ORMModel


class ApprovalIn(ORMModel):
    member_id: int | None = None
    name: str
    email: str | None = ""
    phone: str | None = ""
    request_type: str | None = "New Member"
    membership_type: str | None = None
    date: DateType | None = None
    branch: str | None = None
    status: str | None = None
    photo_url: str | None = ""
    promotion_id: int | None = None
    promotion_applied: str | None = None


class ApprovalOut(ORMModel):
    id: int
    member_id: int | None = None
    name: str
    email: str | None = ""
    phone: str | None = ""
    request_type: str | None = None
    membership_type: str | None = None
    date: DateType | None = None
    branch: str | None = None
    status: str
    photo_url: str | None = ""
    promotion_id: int | None = None
    promotion_applied: str | None = None
