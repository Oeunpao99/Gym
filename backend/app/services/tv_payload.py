"""TV/kiosk payload shaping, ported from server.js makeTvPayload/tvPayloadFromRow."""

from __future__ import annotations

from datetime import datetime

from app.models.checkin import Checkin
from app.models.member import Member
from app.schemas.checkin import CheckinOut, TvPayload
from app.services.branch_utils import normalize_branch_name
from app.services.lifecycle import to_member_out
from app.services.member_codes import make_member_code


def build_tv_payload(
    checkin_id: int | None,
    member: Member | None,
    member_code: str | None,
    scanned_at: datetime,
    branch: str | None,
    result: str,
    notes: str | None,
) -> TvPayload:
    normalized_member = to_member_out(member) if member else None
    safe_branch = normalize_branch_name(branch)
    safe_member_code = (
        member_code
        or (normalized_member.member_code if normalized_member else None)
        or (make_member_code(member.id) if member else "")
    )
    if normalized_member and not normalized_member.member_code:
        normalized_member.member_code = safe_member_code

    return TvPayload(
        scan=CheckinOut(
            id=checkin_id or 0,
            member_id=normalized_member.id if normalized_member else None,
            member_code=safe_member_code,
            scanned_at=scanned_at,
            branch=safe_branch,
            result=result,
            notes=notes,
        ),
        member=normalized_member,
    )


def build_tv_payload_from_checkin(checkin: Checkin | None, member: Member | None) -> TvPayload | None:
    if not checkin:
        return None
    return build_tv_payload(
        checkin.id, member, checkin.member_code, checkin.scanned_at, checkin.branch, checkin.result, checkin.notes
    )
