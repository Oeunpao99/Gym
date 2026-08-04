from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import CurrentUser, get_current_user, is_branch_manager
from app.models.checkin import Checkin
from app.models.member import Member
from app.schemas.checkin import CheckinOut

router = APIRouter(prefix="/api/checkins", tags=["checkins"], dependencies=[Depends(get_current_user)])


def _rows_to_out(rows) -> list[CheckinOut]:
    out = []
    for checkin, name, membership_type, member_status, photo_url in rows:
        out.append(
            CheckinOut(
                id=checkin.id,
                member_id=checkin.member_id,
                member_code=checkin.member_code,
                scanned_at=checkin.scanned_at,
                branch=checkin.branch,
                result=checkin.result,
                notes=checkin.notes,
                member_name=name,
                membership_type=membership_type,
                status=member_status,
                photo_url=photo_url,
            )
        )
    return out


@router.get("", response_model=list[CheckinOut])
def list_checkins(db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    query = db.query(
        Checkin,
        Member.name,
        Member.membership_type,
        Member.status,
        Member.photo_url,
    ).outerjoin(Member, Member.id == Checkin.member_id)
    if is_branch_manager(user):
        query = query.filter(Checkin.branch == user.branch)
    rows = query.order_by(Checkin.id.desc()).limit(100).all()
    return _rows_to_out(rows)
