"""GET /api/reports/summary aggregation, ported from server.js query-for-query so the
returned numbers match exactly (these are raw status-string/date comparisons, not the
lifecycle-normalized values from services/lifecycle.py - the old app computed this summary
independently of normalizeMemberLifecycle, and this keeps that same behavior)."""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.checkin import Checkin
from app.models.member import Member
from app.models.renewal import Renewal
from app.services.dates import today


def _branch_filter(query, model, branch: str | None):
    if branch:
        return query.filter(model.branch == branch)
    return query


def build_summary(db: Session, branch: str | None) -> dict:
    now = today()
    month_start = now.replace(day=1)
    week_ahead = now + timedelta(days=7)

    members_q = _branch_filter(db.query(Member), Member, branch)
    total = members_q.count()

    active = _branch_filter(db.query(Member), Member, branch).filter(
        func.lower(Member.status).like("%active%"),
        (Member.expiry_date.is_(None)) | (Member.expiry_date >= now),
    ).count()

    pending = _branch_filter(db.query(Member), Member, branch).filter(
        func.lower(Member.status).like("%pending%")
    ).count()

    renewing = _branch_filter(db.query(Member), Member, branch).filter(
        func.lower(Member.status).like("%renewing%")
    ).count()

    expired = _branch_filter(db.query(Member), Member, branch).filter(
        func.lower(Member.status).like("%expire%")
        | ((Member.expiry_date.isnot(None)) & (Member.expiry_date < now))
    ).count()

    expiring_soon = _branch_filter(db.query(Member), Member, branch).filter(
        Member.expiry_date.isnot(None),
        Member.expiry_date >= now,
        Member.expiry_date <= week_ahead,
    ).count()

    scans_today = _branch_filter(db.query(Checkin), Checkin, branch).filter(
        func.date(Checkin.scanned_at) == now
    ).count()

    renewals_today = _branch_filter(db.query(Renewal), Renewal, branch).filter(
        (Renewal.request_date == now) | (Renewal.processed_date == now)
    ).count()

    renewals_month = _branch_filter(db.query(Renewal), Renewal, branch).filter(
        (Renewal.request_date >= month_start) | (Renewal.processed_date >= month_start)
    ).count()

    by_membership_type = (
        _branch_filter(db.query(func.coalesce(Member.membership_type, "Unassigned").label("label"), func.count().label("count")), Member, branch)
        .group_by("label")
        .order_by(func.count().desc())
        .all()
    )

    by_branch = (
        db.query(func.coalesce(Member.branch, "Unassigned").label("label"), func.count().label("count"))
        .group_by("label")
        .order_by(func.count().desc())
        .all()
    )
    if branch:
        by_branch = [row for row in by_branch if row.label == branch]

    recent_rows = (
        _branch_filter(
            db.query(
                Checkin,
                Member.name.label("member_name"),
                Member.membership_type.label("membership_type"),
                Member.status.label("member_status"),
            ),
            Checkin,
            branch,
        )
        .outerjoin(Member, Member.id == Checkin.member_id)
        .order_by(Checkin.id.desc())
        .limit(10)
        .all()
    )
    recent_checkins = [
        {
            "id": checkin.id,
            "member_id": checkin.member_id,
            "member_code": checkin.member_code,
            "scanned_at": checkin.scanned_at,
            "branch": checkin.branch,
            "result": checkin.result,
            "notes": checkin.notes,
            "name": member_name,
            "membership_type": membership_type,
            "status": member_status.value if hasattr(member_status, "value") else member_status,
        }
        for checkin, member_name, membership_type, member_status in recent_rows
    ]

    by_membership_type_out = [{"label": row.label, "count": row.count} for row in by_membership_type]
    by_branch_out = [{"label": row.label, "count": row.count} for row in by_branch]

    return {
        "total_records": total,
        "active_members": active,
        "pending_approvals": pending,
        "renewing_members": renewing,
        "expired_members": expired,
        "expiring_soon": expiring_soon,
        "scans_today": scans_today,
        "renewals_today": renewals_today,
        "renewals_this_month": renewals_month,
        "by_membership_type": by_membership_type_out,
        "by_branch": by_branch_out,
        "daily_report": {
            "date": now,
            "by_membership_type": by_membership_type_out,
            "total_active": active,
            "total_renewal": renewals_today,
            "total_expire": expired,
        },
        "recent_checkins": recent_checkins,
    }
