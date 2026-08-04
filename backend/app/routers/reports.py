from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.crud import generic
from app.database import get_db
from app.deps import CurrentUser, get_current_user, is_branch_manager
from app.models.report import Report
from app.schemas.report import ReportIn, ReportOut
from app.services.reports import build_summary

router = APIRouter(prefix="/api/reports", tags=["reports"], dependencies=[Depends(get_current_user)])


@router.get("/summary")
def reports_summary(db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    branch = user.branch if is_branch_manager(user) else None
    return build_summary(db, branch)


@router.get("", response_model=list[ReportOut])
def list_reports(db: Session = Depends(get_db)):
    return generic.list_all(db, Report)


@router.get("/{item_id}", response_model=ReportOut)
def get_report(item_id: int, db: Session = Depends(get_db)):
    return generic.get_or_404(db, Report, item_id)


@router.post("", response_model=ReportOut, status_code=201)
def create_report(payload: ReportIn, db: Session = Depends(get_db)):
    return generic.create(db, Report, payload.model_dump())


@router.put("/{item_id}", response_model=ReportOut)
def update_report(item_id: int, payload: ReportIn, db: Session = Depends(get_db)):
    item = generic.get_or_404(db, Report, item_id)
    return generic.update_partial(db, item, payload.model_dump(exclude_unset=True))


@router.delete("/{item_id}")
def delete_report(item_id: int, db: Session = Depends(get_db)):
    return {"deleted": generic.delete(db, Report, item_id)}
