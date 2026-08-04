from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import CurrentUser, get_current_user, is_branch_manager
from app.models.checkin import Checkin
from app.schemas.checkin import ScanRequest
from app.services.access import member_scan_status
from app.services.branch_utils import normalize_branch_name
from app.services.lifecycle import to_member_out
from app.services.member_codes import make_member_code
from app.services.scan_parser import find_member_by_scan_code
from app.services.sse import broadcast
from app.services.tv_payload import build_tv_payload

router = APIRouter(prefix="/api", tags=["scan"])


@router.post("/scan")
async def scan(
    payload: ScanRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    branch = normalize_branch_name(user.branch if is_branch_manager(user) else payload.branch)
    scanned_at = datetime.now(timezone.utc)

    member, normalized_code = find_member_by_scan_code(db, payload.code)

    if not member:
        checkin = Checkin(
            member_id=None,
            member_code=normalized_code,
            scanned_at=scanned_at,
            branch=branch,
            result="not_found",
            notes="Member not found",
        )
        db.add(checkin)
        db.commit()
        db.refresh(checkin)

        tv_payload = build_tv_payload(checkin.id, None, normalized_code, scanned_at, branch, "not_found", "Member not found")
        await broadcast(branch, "scan", tv_payload.model_dump(mode="json"))

        return JSONResponse(
            status_code=404,
            content={
                "can_scan": False,
                "result": "not_found",
                "message": "Member code was not found.",
                "scanned_at": scanned_at.isoformat(),
                "scan": tv_payload.scan.model_dump(mode="json"),
            },
        )

    normalized_member = to_member_out(member)
    can_scan, result, message = member_scan_status(normalized_member.status, member.expiry_date)
    member_code = member.member_code or make_member_code(member.id)

    checkin = Checkin(
        member_id=member.id,
        member_code=member_code,
        scanned_at=scanned_at,
        branch=branch,
        result=result,
        notes=message,
    )
    db.add(checkin)
    db.commit()
    db.refresh(checkin)

    tv_payload = build_tv_payload(checkin.id, member, member_code, scanned_at, branch, result, message)
    await broadcast(branch, "scan", tv_payload.model_dump(mode="json"))

    normalized_member.member_code = member_code

    return {
        "can_scan": can_scan,
        "result": result,
        "message": message,
        "scanned_at": scanned_at,
        "scan": tv_payload.scan,
        "member": normalized_member,
    }
