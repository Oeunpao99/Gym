from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.crud import generic
from app.database import get_db
from app.deps import CurrentUser, get_current_user, is_branch_manager, require_approver
from app.models.enums import MemberStatus, RenewalStatus
from app.models.member import Member
from app.models.membership_type import MembershipType
from app.models.renewal import Renewal
from app.schemas.renewal import RenewalIn, RenewalOut, RenewalProcessRequest
from app.services.dates import Duration, calculate_end_date, days_left, duration_from_membership, today
from app.services.lifecycle import to_member_out
from app.services.promotions import (
    increment_promotion_usage,
    load_valid_promotion,
    promo_extra_duration,
    promotion_display_name,
)

router = APIRouter(prefix="/api/renewals", tags=["renewals"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[RenewalOut])
def list_renewals(db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    query = db.query(Renewal)
    if is_branch_manager(user):
        query = query.filter(Renewal.branch == user.branch)
    return query.order_by(Renewal.id.desc()).all()


@router.get("/{item_id}", response_model=RenewalOut)
def get_renewal(item_id: int, db: Session = Depends(get_db)):
    return generic.get_or_404(db, Renewal, item_id)


@router.post("", response_model=RenewalOut, status_code=201)
def create_renewal(payload: RenewalIn, db: Session = Depends(get_db)):
    data = payload.model_dump()
    member = db.get(Member, data["member_id"]) if data.get("member_id") else None

    data["status"] = RenewalStatus.RENEWING
    data["processed_date"] = None
    if member:
        data["member_code"] = data.get("member_code") or member.member_code
        data["photo_url"] = data.get("photo_url") or member.photo_url
        data["branch"] = data.get("branch") or member.branch

    renewal = generic.create(db, Renewal, data)

    if member:
        member.status = MemberStatus.RENEWING
        db.commit()

    return renewal


@router.put("/{item_id}", response_model=RenewalOut)
def update_renewal(item_id: int, payload: RenewalIn, db: Session = Depends(get_db)):
    item = generic.get_or_404(db, Renewal, item_id)
    return generic.update_partial(db, item, payload.model_dump(exclude_unset=True))


@router.delete("/{item_id}")
def delete_renewal(item_id: int, db: Session = Depends(get_db)):
    return {"deleted": generic.delete(db, Renewal, item_id)}


@router.post("/{item_id}/process")
def process_renewal(
    item_id: int,
    payload: RenewalProcessRequest,
    db: Session = Depends(get_db),
    approver: CurrentUser = Depends(require_approver),
):
    renewal = db.get(Renewal, item_id)
    if not renewal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Renewal not found")
    if not renewal.member_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Missing member_id")
    member = db.get(Member, renewal.member_id)
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")

    membership_type = payload.membership_type or renewal.membership_type or member.membership_type
    membership_type_row = db.query(MembershipType).filter(MembershipType.name == membership_type).first()
    duration_days = (
        payload.duration_days
        or renewal.bonus_days
        or (membership_type_row.duration_days if membership_type_row else None)
        or 30
    )
    package_duration = duration_from_membership(membership_type, duration_days)

    selected_start = payload.start_date or renewal.request_date or today()
    # Stack renewals on top of an unexpired membership; otherwise start from selected_start.
    if member.expiry_date and member.expiry_date >= today():
        base_date = member.expiry_date
    else:
        base_date = selected_start

    promotion_id = payload.promotion_id or renewal.promotion_id
    promo = load_valid_promotion(db, promotion_id, membership_type, selected_start)
    new_expiry = calculate_end_date(base_date, package_duration, promo_extra_duration(promo) if promo else None)

    previous_expiry = member.expiry_date
    promotion_applied = (
        promotion_display_name(promo) if promo else (payload.promotion_applied or renewal.promotion_applied or "")
    )
    branch = payload.branch or renewal.branch or member.branch

    member.membership_type = membership_type
    member.expiry_date = new_expiry
    member.days_left = days_left(new_expiry)
    member.status = MemberStatus.ACTIVE
    member.promotion_id = promo.id if promo else None
    member.promotion_applied = promotion_applied

    renewal.processed_date = today()
    renewal.status = RenewalStatus.APPROVED
    renewal.previous_end_date = previous_expiry
    renewal.new_end_date = new_expiry
    renewal.membership_type = membership_type
    renewal.promotion_id = promo.id if promo else None
    renewal.promotion_applied = promotion_applied
    renewal.approved_by = payload.approved_by or renewal.approved_by or approver.name
    renewal.branch = branch
    renewal.bonus_days = duration_days

    if promo:
        increment_promotion_usage(db, promo)

    db.commit()
    db.refresh(member)

    return {"renewal": item_id, "member": to_member_out(member)}
