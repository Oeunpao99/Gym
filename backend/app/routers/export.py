from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import CurrentUser, get_current_user, is_branch_manager
from app.models.member import Member
from app.services.csv_export import build_members_csv

router = APIRouter(prefix="/api/export", tags=["export"], dependencies=[Depends(get_current_user)])


@router.get("/members.csv")
def export_members_csv(db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    query = db.query(Member)
    if is_branch_manager(user):
        query = query.filter(Member.branch == user.branch)
    members = query.order_by(Member.id.desc()).all()
    csv_content = build_members_csv(members)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="gym-members-backup.csv"'},
    )
