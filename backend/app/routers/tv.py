import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from starlette.responses import StreamingResponse

from app.database import get_db
from app.models.checkin import Checkin
from app.models.member import Member
from app.schemas.checkin import TvPayload
from app.services.branch_utils import normalize_branch_name
from app.services.sse import format_event, register, unregister
from app.services.tv_payload import build_tv_payload_from_checkin

router = APIRouter(prefix="/api/tv", tags=["tv"])


@router.get("/{branch}/latest", response_model=TvPayload)
def latest_scan(branch: str, db: Session = Depends(get_db)):
    branch_name = normalize_branch_name(branch)
    checkin = (
        db.query(Checkin)
        .filter(Checkin.branch.ilike(branch_name))
        .order_by(Checkin.id.desc())
        .first()
    )
    if not checkin:
        return TvPayload(scan=None, member=None)
    member = db.get(Member, checkin.member_id) if checkin.member_id else None
    return build_tv_payload_from_checkin(checkin, member) or TvPayload(scan=None, member=None)


@router.get("/{branch}/stream")
async def stream(branch: str):
    branch_name = normalize_branch_name(branch)
    queue = register(branch_name)

    async def event_source():
        try:
            yield format_event("hello", {"branch": branch_name, "connected_at": _now_iso()})
            while True:
                try:
                    event, data = await asyncio.wait_for(queue.get(), timeout=25)
                    yield format_event(event, data)
                except asyncio.TimeoutError:
                    yield format_event("ping", {"branch": branch_name, "at": _now_iso()})
        finally:
            unregister(branch_name, queue)

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
