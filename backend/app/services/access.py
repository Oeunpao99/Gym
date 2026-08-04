"""Scan access evaluation, ported from server.js memberScanStatus.

Takes the *lifecycle-normalized* status/expiry (see services/lifecycle.py) - the original
app always ran normalizeMemberLifecycle() before memberScanStatus(), so "Expiring Soon" is
treated as scannable and a stale "Active" past expiry is not.
"""

from __future__ import annotations

from datetime import date

from app.services.dates import today


def member_scan_status(effective_status: str, expiry_date: date | None) -> tuple[bool, str, str]:
    """Returns (can_scan, result, message)."""
    status_lower = str(effective_status or "").lower()
    is_expiring_soon = "expiring" in status_lower
    is_active = ("active" in status_lower or is_expiring_soon) and "inactive" not in status_lower

    if not is_active:
        return False, "blocked", f"Member status is {effective_status or 'not active'}."

    is_expired = bool(expiry_date) and expiry_date < today()
    if is_expired:
        return False, "expired", "Membership is expired."

    return True, "allowed", "Active membership verified."
