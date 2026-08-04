from datetime import date

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.orm import Session

from app.crud import generic
from app.database import get_db
from app.deps import get_current_user
from app.models.member import Member
from app.models.promotion import Promotion
from app.schemas.promotion import PromotionIn, PromotionOut
from app.services.promotions import (
    increment_promotion_usage,
    normalize_promotion_status,
    promotion_display_name,
    promotion_is_selectable,
)

router = APIRouter(prefix="/api/promotions", tags=["promotions"], dependencies=[Depends(get_current_user)])


def _to_out(promo: Promotion) -> PromotionOut:
    out = PromotionOut.model_validate(promo)
    out.status = normalize_promotion_status(promo)
    return out


@router.get("", response_model=list[PromotionOut])
def list_promotions(
    eligible: bool = Query(False),
    membership_type: str | None = None,
    as_of: date | None = Query(None, alias="date"),
    db: Session = Depends(get_db),
):
    promos = generic.list_all(db, Promotion)
    if eligible:
        promos = [p for p in promos if promotion_is_selectable(p, membership_type, as_of)]
    return [_to_out(p) for p in promos]


@router.get("/{item_id}", response_model=PromotionOut)
def get_promotion(item_id: int, db: Session = Depends(get_db)):
    promo = generic.get_or_404(db, Promotion, item_id)
    return _to_out(promo)


@router.post("", response_model=PromotionOut, status_code=201)
def create_promotion(payload: PromotionIn, db: Session = Depends(get_db)):
    data = payload.model_dump()
    data.setdefault("status", "Active")
    data["base_duration_unit"] = data.get("base_duration_unit") or "months"
    data["extra_duration_unit"] = data.get("extra_duration_unit") or "days"
    data["used_count"] = data.get("used_count") or 0
    if not data.get("promotion_code"):
        data.pop("promotion_code", None)
    promo = generic.create(db, Promotion, data)
    if not promo.promotion_code:
        promo.promotion_code = f"PROMO-{promo.id:04d}"
        db.commit()
        db.refresh(promo)
    return _to_out(promo)


@router.put("/{item_id}", response_model=PromotionOut)
def update_promotion(item_id: int, payload: PromotionIn, db: Session = Depends(get_db)):
    item = generic.get_or_404(db, Promotion, item_id)
    item = generic.update_partial(db, item, payload.model_dump(exclude_unset=True))
    return _to_out(item)


@router.delete("/{item_id}")
def delete_promotion(item_id: int, db: Session = Depends(get_db)):
    return {"deleted": generic.delete(db, Promotion, item_id)}


@router.post("/{item_id}/apply")
def apply_promotion(item_id: int, member_id: int = Body(..., embed=True), db: Session = Depends(get_db)):
    promo = generic.get_or_404(db, Promotion, item_id)
    member = generic.get_or_404(db, Member, member_id)

    increment_promotion_usage(db, promo)
    note = f"Applied promo: {promotion_display_name(promo)}"
    member.remarks = f"{member.remarks}; {note}" if member.remarks else note
    db.commit()

    return {"applied": True, "promotion": item_id, "member_id": member_id}
