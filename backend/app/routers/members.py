from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import CurrentUser, get_current_user, get_optional_user, is_branch_manager
from app.models.approval import Approval
from app.models.enums import ApprovalStatus, MemberStatus, UserRole
from app.models.member import Member
from app.models.membership_type import MembershipType
from app.models.renewal import Renewal
from app.schemas.member import MemberCreate, MemberOut, MemberUpdate
from app.schemas.renewal import RenewalOut
from app.services.dates import calculate_end_date, days_left, duration_from_membership, today
from app.services.lifecycle import to_member_out
from app.services.member_codes import make_member_code
from app.services.promotions import (
    increment_promotion_usage,
    load_valid_promotion,
    promo_extra_duration,
    promotion_display_name,
)

router = APIRouter(prefix="/api/members", tags=["members"])


@router.get("", response_model=list[MemberOut])
def list_members(
    branch: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    membership_type: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    user: CurrentUser | None = Depends(get_optional_user),
):
    query = db.query(Member)
    effective_branch = user.branch if user and is_branch_manager(user) else branch
    if effective_branch:
        query = query.filter(Member.branch == effective_branch)
    if membership_type:
        query = query.filter(Member.membership_type == membership_type)
    if status_filter:
        lowered = status_filter.lower()
        if "expire" in lowered:
            query = query.filter(
                Member.status.ilike("%expire%") | (Member.expiry_date < today())
            )
        elif "active" in lowered:
            query = query.filter(
                Member.status.ilike("%active%"),
                (Member.expiry_date.is_(None)) | (Member.expiry_date >= today()),
            )
        else:
            query = query.filter(Member.status == status_filter)
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                Member.name.ilike(like),
                Member.email.ilike(like),
                Member.phone.ilike(like),
                Member.member_code.ilike(like),
            )
        )
    members = query.order_by(Member.id.desc()).all()
    return [to_member_out(m) for m in members]


@router.get("/code/{code}", response_model=MemberOut)
def get_member_by_code(code: str, db: Session = Depends(get_db)):
    member = db.query(Member).filter(Member.member_code.ilike(code)).first()
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    return to_member_out(member)


@router.get("/{member_id}", response_model=MemberOut)
def get_member(member_id: int, db: Session = Depends(get_db)):
    member = db.get(Member, member_id)
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    return to_member_out(member)


@router.get("/{member_id}/renewals", response_model=list[RenewalOut])
def get_member_renewals(member_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Renewal)
        .filter(Renewal.member_id == member_id)
        .order_by(Renewal.id.desc())
        .all()
    )


@router.get("/{member_id}/promotions", response_model=list[RenewalOut])
def get_member_promotions(member_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Renewal)
        .filter(Renewal.member_id == member_id, Renewal.promotion_applied.isnot(None), Renewal.promotion_applied != "")
        .order_by(Renewal.processed_date.desc())
        .all()
    )


@router.post("", response_model=MemberOut, status_code=201)
def create_member(
    payload: MemberCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    membership_type_row = db.query(MembershipType).filter(MembershipType.name == payload.membership_type).first()
    package_duration = duration_from_membership(
        payload.membership_type, membership_type_row.duration_days if membership_type_row else None
    )

    join_date = payload.join_date or today()
    promo = load_valid_promotion(db, payload.promotion_id, payload.membership_type, join_date)
    expiry = calculate_end_date(join_date, package_duration, promo_extra_duration(promo) if promo else None)

    branch = user.branch if is_branch_manager(user) else payload.branch
    can_direct_approve = user.role in (UserRole.HEAD_OFFICE, UserRole.CEO)
    member_status = (
        MemberStatus.ACTIVE
        if (can_direct_approve and payload.allow_direct_approval)
        else MemberStatus.PENDING
    )

    member = Member(
        member_code=payload.member_code or "",
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        membership_type=payload.membership_type,
        join_date=join_date,
        expiry_date=expiry,
        days_left=days_left(expiry),
        status=member_status,
        remarks=payload.remarks,
        photo_url=payload.photo_url,
        branch=branch,
        promotion_id=promo.id if promo else None,
        promotion_applied=promotion_display_name(promo) if promo else None,
    )
    db.add(member)
    db.flush()
    if not member.member_code:
        member.member_code = make_member_code(member.id)
    if promo:
        increment_promotion_usage(db, promo)

    if member_status == MemberStatus.PENDING:
        db.add(
            Approval(
                member_id=member.id,
                name=member.name,
                email=member.email,
                phone=member.phone,
                request_type="New Member",
                membership_type=member.membership_type,
                date=join_date,
                branch=member.branch,
                status=ApprovalStatus.PENDING,
                photo_url=member.photo_url,
                promotion_id=member.promotion_id,
                promotion_applied=member.promotion_applied,
            )
        )

    db.commit()
    db.refresh(member)
    return to_member_out(member)


@router.put("/{member_id}", response_model=MemberOut)
def update_member(
    member_id: int,
    payload: MemberUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    member = db.get(Member, member_id)
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")

    branch = user.branch if is_branch_manager(user) else (payload.branch or member.branch)
    if is_branch_manager(user):
        new_status = MemberStatus.PENDING
    elif payload.status:
        new_status = MemberStatus(payload.status)
    else:
        new_status = member.status

    member.member_code = payload.member_code or member.member_code or make_member_code(member.id)
    member.name = payload.name
    member.email = payload.email
    member.phone = payload.phone
    member.membership_type = payload.membership_type
    member.join_date = payload.join_date
    member.expiry_date = payload.expiry_date
    member.days_left = payload.days_left or 0
    member.status = new_status
    member.remarks = payload.remarks or ""
    member.photo_url = payload.photo_url or ""
    member.branch = branch
    member.promotion_id = payload.promotion_id
    member.promotion_applied = payload.promotion_applied or ""

    db.commit()
    db.refresh(member)
    return to_member_out(member)


@router.delete("/{member_id}")
def delete_member(member_id: int, db: Session = Depends(get_db), _user: CurrentUser = Depends(get_current_user)):
    member = db.get(Member, member_id)
    if not member:
        return {"deleted": 0}
    db.delete(member)
    db.commit()
    return {"deleted": 1}
