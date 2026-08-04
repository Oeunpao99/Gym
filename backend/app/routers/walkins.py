from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.crud import generic
from app.database import get_db
from app.deps import get_current_user
from app.models.walkin import Walkin
from app.schemas.walkin import WalkinIn, WalkinOut

router = APIRouter(prefix="/api/walkins", tags=["walkins"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[WalkinOut])
def list_walkins(db: Session = Depends(get_db)):
    return generic.list_all(db, Walkin)


@router.get("/{item_id}", response_model=WalkinOut)
def get_walkin(item_id: int, db: Session = Depends(get_db)):
    return generic.get_or_404(db, Walkin, item_id)


@router.post("", response_model=WalkinOut, status_code=201)
def create_walkin(payload: WalkinIn, db: Session = Depends(get_db)):
    return generic.create(db, Walkin, payload.model_dump())


@router.put("/{item_id}", response_model=WalkinOut)
def update_walkin(item_id: int, payload: WalkinIn, db: Session = Depends(get_db)):
    item = generic.get_or_404(db, Walkin, item_id)
    return generic.update_partial(db, item, payload.model_dump(exclude_unset=True))


@router.delete("/{item_id}")
def delete_walkin(item_id: int, db: Session = Depends(get_db)):
    return {"deleted": generic.delete(db, Walkin, item_id)}
