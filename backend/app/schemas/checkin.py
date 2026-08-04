from datetime import datetime

from app.schemas.common import ORMModel
from app.schemas.member import MemberOut


class CheckinOut(ORMModel):
    id: int
    member_id: int | None = None
    member_code: str | None = ""
    scanned_at: datetime
    branch: str | None = None
    result: str | None = None
    notes: str | None = ""
    member_name: str | None = None
    membership_type: str | None = None
    status: str | None = None
    photo_url: str | None = None


class ScanRequest(ORMModel):
    code: str
    branch: str | None = None


class TvPayload(ORMModel):
    scan: CheckinOut | None = None
    member: MemberOut | None = None


class ScanResponse(ORMModel):
    can_scan: bool
    result: str
    message: str
    scanned_at: datetime
    scan: CheckinOut
    member: MemberOut | None = None
