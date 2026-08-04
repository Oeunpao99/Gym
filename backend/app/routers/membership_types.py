from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.crud import generic
from app.database import get_db
from app.deps import get_current_user
from app.models.membership_type import MembershipType
from app.schemas.membership_type import MembershipTypeIn, MembershipTypeOut

router = APIRouter(
    prefix="/api/membership-types", tags=["membership-types"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=list[MembershipTypeOut])
def list_membership_types(db: Session = Depends(get_db)):
    return generic.list_all(db, MembershipType)


@router.get("/{item_id}", response_model=MembershipTypeOut)
def get_membership_type(item_id: int, db: Session = Depends(get_db)):
    return generic.get_or_404(db, MembershipType, item_id)


@router.post("", response_model=MembershipTypeOut, status_code=201)
def create_membership_type(payload: MembershipTypeIn, db: Session = Depends(get_db)):
    return generic.create(db, MembershipType, payload.model_dump())


@router.put("/{item_id}", response_model=MembershipTypeOut)
def update_membership_type(item_id: int, payload: MembershipTypeIn, db: Session = Depends(get_db)):
    item = generic.get_or_404(db, MembershipType, item_id)
    return generic.update_partial(db, item, payload.model_dump(exclude_unset=True))


@router.delete("/{item_id}")
def delete_membership_type(item_id: int, db: Session = Depends(get_db)):
    return {"deleted": generic.delete(db, MembershipType, item_id)}
