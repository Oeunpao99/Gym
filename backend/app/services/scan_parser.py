"""Scanned-code parsing, ported from server.js (normalizeScanCode, findMemberByScanCode)."""

from __future__ import annotations

import json
import re
from urllib.parse import urlparse, parse_qs

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.member import Member

_CODE_RE = re.compile(r"PS-\d+", re.IGNORECASE)
_ID_FROM_CODE_RE = re.compile(r"^PS-0*(\d+)$", re.IGNORECASE)


def normalize_scan_code(raw: str) -> str:
    value = str(raw or "").strip()
    if not value:
        return ""

    try:
        parsed = json.loads(value)
        if isinstance(parsed, dict):
            value = parsed.get("member_code") or parsed.get("card_number") or parsed.get("code") or parsed.get("id") or value
    except (ValueError, TypeError):
        pass

    try:
        parsed_url = urlparse(str(value))
        if parsed_url.query:
            qs = parse_qs(parsed_url.query)
            value = (qs.get("code") or qs.get("member_code") or qs.get("id") or [value])[0]
    except ValueError:
        pass

    code_match = _CODE_RE.search(str(value))
    if code_match:
        return code_match.group(0).upper()
    return str(value).strip()


def find_member_by_scan_code(db: Session, raw: str) -> tuple[Member | None, str]:
    code = normalize_scan_code(raw)
    if not code:
        return None, ""

    numeric_id: int | None = None
    if code.isdigit():
        numeric_id = int(code)
    else:
        id_match = _ID_FROM_CODE_RE.match(code)
        if id_match:
            numeric_id = int(id_match.group(1))

    query = db.query(Member).filter(func.upper(Member.member_code) == code.upper())
    member = query.first()
    if not member and numeric_id is not None:
        member = db.get(Member, numeric_id)
    return member, code
