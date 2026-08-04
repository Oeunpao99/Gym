from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.crud import generic
from app.database import get_db
from app.deps import get_current_user
from app.models.branch import Branch
from app.schemas.branch import BranchIn, BranchOut

router = APIRouter(prefix="/api/branches", tags=["branches"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[BranchOut])
def list_branches(db: Session = Depends(get_db)):
    return generic.list_all(db, Branch)


@router.get("/{branch_id}", response_model=BranchOut)
def get_branch(branch_id: int, db: Session = Depends(get_db)):
    return generic.get_or_404(db, Branch, branch_id)


@router.post("", response_model=BranchOut, status_code=201)
def create_branch(payload: BranchIn, db: Session = Depends(get_db)):
    return generic.create(db, Branch, payload.model_dump())


@router.put("/{branch_id}", response_model=BranchOut)
def update_branch(branch_id: int, payload: BranchIn, db: Session = Depends(get_db)):
    item = generic.get_or_404(db, Branch, branch_id)
    return generic.update_partial(db, item, payload.model_dump(exclude_unset=True))


@router.delete("/{branch_id}")
def delete_branch(branch_id: int, db: Session = Depends(get_db)):
    return {"deleted": generic.delete(db, Branch, branch_id)}
