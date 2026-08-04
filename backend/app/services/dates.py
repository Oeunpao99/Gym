"""Date/duration math ported from server.js (addDuration, calculateEndDate, durationFromMembership).

Kept as pure functions operating on `datetime.date` so the day-of-month clamping behavior
(e.g. Jan 31 + 1 month -> Feb 28/29) matches the old UTC-anchored implementation exactly.
"""

from __future__ import annotations

import calendar
import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone


def today() -> date:
    return datetime.now(timezone.utc).date()


@dataclass
class Duration:
    value: int
    unit: str  # "days" | "months" | "years"


def add_duration(start: date, value: int, unit: str) -> date:
    amount = int(value or 0)
    normalized_unit = (unit or "days").lower()

    if normalized_unit.startswith("month"):
        return _add_months(start, amount)
    if normalized_unit.startswith("year"):
        return _add_months(start, amount * 12)
    return start + timedelta(days=amount)


def _add_months(start: date, months: int) -> date:
    total_month_index = start.month - 1 + months
    year = start.year + total_month_index // 12
    month = total_month_index % 12 + 1
    last_day = calendar.monthrange(year, month)[1]
    day = min(start.day, last_day)
    return date(year, month, day)


def duration_from_membership(membership_type: str | None, duration_days: int | None) -> Duration:
    code = str(membership_type or "").strip().upper()
    months_match = re.match(r"^(\d+)M$", code)
    years_match = re.match(r"^(\d+)Y$", code)
    if months_match:
        return Duration(value=int(months_match.group(1)), unit="months")
    if years_match:
        return Duration(value=int(years_match.group(1)), unit="years")
    return Duration(value=int(duration_days or 30), unit="days")


def calculate_end_date(start: date | None, package_duration: Duration, promo_extra: Duration | None) -> date:
    base = start or today()
    end = add_duration(base, package_duration.value, package_duration.unit)
    if promo_extra:
        end = add_duration(end, promo_extra.value, promo_extra.unit)
    return end


def days_left(expiry: date | None) -> int:
    if not expiry:
        return 0
    return max(0, (expiry - today()).days)
