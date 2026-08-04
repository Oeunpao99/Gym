"""Promotion validation/eligibility, ported from server.js (membershipMatchesPromotion,
promotionIsSelectable, loadValidPromotion, normalizePromotion, promotionDisplayName)."""

from __future__ import annotations

from datetime import date

from fastapi import HTTPException, status as http_status
from sqlalchemy.orm import Session

from app.models.enums import PromotionStatus
from app.models.promotion import Promotion
from app.services.dates import Duration, duration_from_membership, today


def promotion_display_name(promo: Promotion) -> str:
    code = promo.promotion_code or f"PROMO-{promo.id}"
    return f"{code} - {promo.promotion_name}" if promo.promotion_name else code


def normalize_promotion_status(promo: Promotion) -> str:
    """Read-time only: flips Active -> Expired once end_date has passed, without persisting."""
    if promo.status == PromotionStatus.ACTIVE and promo.end_date and promo.end_date < today():
        return PromotionStatus.EXPIRED.value
    return promo.status.value if isinstance(promo.status, PromotionStatus) else str(promo.status)


def membership_matches_promotion(promo: Promotion, membership_type: str | None) -> bool:
    applicable = str(promo.applicable_membership_type or "").strip()
    selected = str(membership_type or "").strip()
    if not applicable or applicable.lower() in ("all", "any", "yes"):
        return True
    if not selected:
        return True
    options = [item.strip().lower() for item in applicable.split(",") if item.strip()]
    if selected.lower() in options:
        return True

    required = duration_from_membership(selected, 0)
    return (
        int(promo.base_duration_value or 0) == required.value
        and str(promo.base_duration_unit or "months").lower().startswith(required.unit[:-1])
    )


def promotion_is_selectable(promo: Promotion, membership_type: str | None, as_of: date | None = None) -> bool:
    effective_status = normalize_promotion_status(promo)
    if effective_status.lower() != "active":
        return False
    if not membership_matches_promotion(promo, membership_type):
        return False

    check_date = as_of or today()
    if promo.start_date and check_date < promo.start_date:
        return False
    if promo.end_date and check_date > promo.end_date:
        return False

    limit = int(promo.usage_limit or 0)
    used = int(promo.used_count or 0)
    if limit > 0 and used >= limit:
        return False
    return True


def load_valid_promotion(
    db: Session, promotion_id: int | None, membership_type: str | None, as_of: date | None = None
) -> Promotion | None:
    if not promotion_id:
        return None
    promo = db.get(Promotion, promotion_id)
    if not promo:
        raise HTTPException(http_status.HTTP_404_NOT_FOUND, "Promotion not found")
    if not promotion_is_selectable(promo, membership_type, as_of):
        raise HTTPException(
            http_status.HTTP_400_BAD_REQUEST,
            "Promotion is not active, not in date range, usage-limited, or not applicable to this package",
        )
    return promo


def promo_extra_duration(promo: Promotion) -> Duration:
    return Duration(value=int(promo.extra_duration_value or 0), unit=promo.extra_duration_unit or "days")


def increment_promotion_usage(db: Session, promo: Promotion) -> None:
    promo.used_count = int(promo.used_count or 0) + 1
