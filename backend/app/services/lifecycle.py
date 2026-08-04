"""Member lifecycle normalization, ported from server.js normalizeMemberLifecycle.

Status/days_left are never trusted from storage on read - they're recomputed here so every
endpoint that returns a member (list, detail, reports, CSV export) shows consistent values.
"Expiring Soon" is derived-only and is never written back to the members table.
"""

from __future__ import annotations

from app.models.enums import MemberStatus
from app.models.member import Member
from app.schemas.member import MemberOut
from app.services.dates import today


def effective_status_and_days_left(status: str, expiry_date, stored_days_left: int) -> tuple[str, int]:
    status_lower = str(status or "").lower()
    is_pending_or_renewing = "pending" in status_lower or "renew" in status_lower

    if not expiry_date:
        days = max(0, stored_days_left or 0)
        return status, days

    is_expired = expiry_date < today()
    days = max(0, (expiry_date - today()).days)

    if is_expired and not is_pending_or_renewing:
        return MemberStatus.EXPIRE.value, 0

    if not is_pending_or_renewing:
        if days <= 7:
            return "Expiring Soon", days
        if "expire" in status_lower:
            return MemberStatus.ACTIVE.value, days

    return status, days


def to_member_out(member: Member) -> MemberOut:
    raw_status = member.status.value if hasattr(member.status, "value") else member.status
    effective_status, effective_days_left = effective_status_and_days_left(
        raw_status, member.expiry_date, member.days_left
    )
    out = MemberOut.model_validate(member)
    out.status = effective_status
    out.days_left = effective_days_left
    return out
