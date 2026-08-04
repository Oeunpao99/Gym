"""Small generic CRUD helpers shared by the simple entity routers (branches,
membership_types, walkins, reports) and used as the storage layer underneath the
bespoke-defaulting routers (approvals, renewals, promotions) - ported from server.js's
registerCrud, but defaulting/normalization rules stay in each router since they differ
per entity (see server.js's per-entity special-casing that registerCrud itself didn't
fully abstract away either).
"""

from __future__ import annotations

from typing import TypeVar

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

ModelT = TypeVar("ModelT")


def list_all(db: Session, model: type[ModelT], order_by_id_desc: bool = True) -> list[ModelT]:
    query = db.query(model)
    if order_by_id_desc:
        query = query.order_by(model.id.desc())
    return query.all()


def get_or_404(db: Session, model: type[ModelT], item_id: int) -> ModelT:
    item = db.get(model, item_id)
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{model.__name__} not found")
    return item


def create(db: Session, model: type[ModelT], data: dict) -> ModelT:
    item = model(**data)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_partial(db: Session, item: ModelT, data: dict) -> ModelT:
    """`data` should already be pre-filtered to only the keys the client actually sent
    (e.g. via Pydantic's `model_dump(exclude_unset=True)`), matching the old app's
    "only update fields present in the request body" PUT semantics."""
    for key, value in data.items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


def delete(db: Session, model: type[ModelT], item_id: int) -> int:
    item = db.get(model, item_id)
    if not item:
        return 0
    db.delete(item)
    db.commit()
    return 1
