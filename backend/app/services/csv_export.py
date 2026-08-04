"""Members CSV export, ported from server.js csvEscape + /api/export/members.csv."""

from __future__ import annotations

import csv
import io

from app.models.member import Member

_COLUMNS = [
    "member_code",
    "name",
    "email",
    "phone",
    "membership_type",
    "join_date",
    "expiry_date",
    "days_left",
    "status",
    "branch",
    "remarks",
]


def build_members_csv(members: list[Member]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(_COLUMNS)
    for member in members:
        status = member.status.value if hasattr(member.status, "value") else member.status
        writer.writerow(
            [
                member.member_code,
                member.name,
                member.email or "",
                member.phone or "",
                member.membership_type,
                member.join_date or "",
                member.expiry_date or "",
                member.days_left,
                status,
                member.branch or "",
                member.remarks or "",
            ]
        )
    return buffer.getvalue()
