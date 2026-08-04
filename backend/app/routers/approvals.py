from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.orm import Session

from app.crud import generic
from app.database import get_db
from app.deps import CurrentUser, get_current_user, is_branch_manager, require_approver
from app.models.approval import Approval
from app.models.enums import ApprovalStatus, MemberStatus
from app.models.member import Member
from app.models.membership_type import MembershipType
from app.schemas.approval import ApprovalIn, ApprovalOut
from app.services.dates import Duration, calculate_end_date, days_left
from app.services.lifecycle import to_member_out
from app.services.member_codes import make_member_code

router = APIRouter(prefix="/api/approvals", tags=["approvals"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[ApprovalOut])
def list_approvals(
    all: bool = Query(False),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    query = db.query(Approval)
    if is_branch_manager(user):
        query = query.filter(Approval.branch == user.branch)
    if not all:
        query = query.filter(Approval.status == ApprovalStatus.PENDING)
    return query.order_by(Approval.id.desc()).all()


@router.get("/{item_id}", response_model=ApprovalOut)
def get_approval(item_id: int, db: Session = Depends(get_db)):
    return generic.get_or_404(db, Approval, item_id)


@router.post("", response_model=ApprovalOut, status_code=201)
def create_approval(payload: ApprovalIn, db: Session = Depends(get_db)):
    data = payload.model_dump()
    data["status"] = ApprovalStatus.PENDING
    return generic.create(db, Approval, data)


@router.put("/{item_id}", response_model=ApprovalOut)
def update_approval(item_id: int, payload: ApprovalIn, db: Session = Depends(get_db)):
    item = generic.get_or_404(db, Approval, item_id)
    return generic.update_partial(db, item, payload.model_dump(exclude_unset=True))


@router.delete("/{item_id}")
def delete_approval(item_id: int, db: Session = Depends(get_db)):
    return {"deleted": generic.delete(db, Approval, item_id)}


def _approve_one(db: Session, approval_id: int) -> dict:
    approval = db.get(Approval, approval_id)
    if not approval:
        return {"id": approval_id, "ok": False, "stale": True, "error": "Approval not found"}

    if approval.member_id:
        member = db.get(Member, approval.member_id)
        if member:
            member.status = MemberStatus.ACTIVE
            note = f"Approved from request #{approval_id}"
            member.remarks = f"{member.remarks}; {note}" if member.remarks else note
        approval.status = ApprovalStatus.APPROVED
        db.commit()
        return {"id": approval_id, "ok": True, "member_id": approval.member_id}

    membership_type = db.query(MembershipType).filter(
        MembershipType.name == approval.membership_type
    ).first()
    duration = Duration(value=membership_type.duration_days if membership_type else 30, unit="days")
    expiry = calculate_end_date(approval.date, duration, None)

    member = Member(
        member_code="",
        name=approval.name,
        email=approval.email,
        phone=approval.phone,
        membership_type=approval.membership_type,
        join_date=approval.date,
        expiry_date=expiry,
        days_left=days_left(expiry),
        status=MemberStatus.ACTIVE,
        remarks=f"Created from approval #{approval_id}",
        photo_url=approval.photo_url,
        branch=approval.branch,
        promotion_id=approval.promotion_id,
        promotion_applied=approval.promotion_applied,
    )
    db.add(member)
    db.flush()
    member.member_code = make_member_code(member.id)
    approval.status = ApprovalStatus.APPROVED
    approval.member_id = member.id
    db.commit()
    return {"id": approval_id, "ok": True, "member_id": member.id}


@router.post("/{item_id}/approve")
def approve(item_id: int, db: Session = Depends(get_db), _=Depends(require_approver)):
    result = _approve_one(db, item_id)
    if result.get("stale"):
        return {"stale": True, "message": result["error"]}
    member = db.get(Member, result["member_id"]) if result.get("member_id") else None
    return {"approval": item_id, "member": to_member_out(member) if member else None}


@router.post("/{item_id}/reject")
def reject(item_id: int, db: Session = Depends(get_db), _=Depends(require_approver)):
    approval = db.get(Approval, item_id)
    if not approval:
        return {"stale": True, "message": "Approval not found"}
    approval.status = ApprovalStatus.REJECTED
    db.commit()
    return {"approval": item_id, "status": "Rejected"}


@router.post("/bulk-approve")
def bulk_approve(
    ids: list[int] = Body(..., embed=True), db: Session = Depends(get_db), _=Depends(require_approver)
):
    results = [_approve_one(db, approval_id) for approval_id in ids]
    return {"approved": results}
