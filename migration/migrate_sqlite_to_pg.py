"""One-off migration of data from the old Node app's gym.db (SQLite) into the new
Postgres schema. Re-runnable: truncates the target tables first, so it's safe to run
again after tweaking transforms. Run `alembic upgrade head` against the target database
BEFORE running this script.

Usage (from backend/.venv):
    DATABASE_URL=postgresql+psycopg2://gym:gym@localhost:5433/gym \
    python migration/migrate_sqlite_to_pg.py path/to/gym.db

Known source-data quirks handled here (found by inspecting the actual gym.db, not
assumed - see conversation history):
  - approvals/checkins reference member_id values for members that no longer exist in
    the members table (rows were deleted from the old app over time). These FKs are set
    to NULL on migration (member_code/text fields are preserved for history) rather than
    failing the whole run.
  - two members share member_code "PS-0016" (a bug in the old app, which never enforced
    uniqueness). The second one gets a disambiguated code so the new unique constraint
    doesn't reject it.
"""

from __future__ import annotations

import sys
from datetime import date, datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import sqlite3

from sqlalchemy import text

from app.database import SessionLocal
from app.models.approval import Approval
from app.models.branch import Branch
from app.models.checkin import Checkin
from app.models.member import Member
from app.models.membership_type import MembershipType
from app.models.promotion import Promotion
from app.models.renewal import Renewal
from app.models.report import Report
from app.models.user import User
from app.models.walkin import Walkin
from app.security import hash_password

LEGACY_USERS = [
    {"username": "branch1", "password": "branch123", "name": "Downtown Manager", "role": "Branch Manager", "branch": "Downtown"},
    {"username": "branch2", "password": "branch123", "name": "Uptown Manager", "role": "Branch Manager", "branch": "Uptown"},
    {"username": "headoffice", "password": "head123", "name": "Head Office", "role": "Head Office", "branch": "Head Office"},
    {"username": "ceo", "password": "ceo123", "name": "CEO", "role": "CEO", "branch": "All Branches"},
]

TABLES_IN_DEPENDENCY_ORDER = [
    "checkins", "renewals", "approvals", "members", "promotions", "membership_types", "branches", "reports", "walkins", "users",
]


def parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        print(f"  ! could not parse date {value!r}, storing as NULL")
        return None


def parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    text_value = str(value).strip()
    try:
        if text_value.endswith("Z"):
            text_value = text_value[:-1] + "+00:00"
        parsed = datetime.fromisoformat(text_value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except ValueError:
        print(f"  ! could not parse timestamp {value!r}, storing as NULL")
        return None


def sqlite_rows(conn: sqlite3.Connection, table: str) -> list[dict]:
    conn.row_factory = sqlite3.Row
    return [dict(row) for row in conn.execute(f"SELECT * FROM {table}")]


def reset_sequence(db, table: str) -> None:
    db.execute(
        text(
            f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
            f"COALESCE((SELECT MAX(id) FROM {table}), 1), true)"
        )
    )


def main(sqlite_path: str) -> None:
    conn = sqlite3.connect(sqlite_path)
    db = SessionLocal()

    print("Truncating target tables...")
    db.execute(text(f"TRUNCATE {', '.join(TABLES_IN_DEPENDENCY_ORDER)} RESTART IDENTITY CASCADE"))
    db.commit()

    print("Migrating branches...")
    for row in sqlite_rows(conn, "branches"):
        db.add(Branch(id=row["id"], code=row["code"] or f"BR-{row['id']:03d}", name=row["name"], address=row.get("address") or "", phone=row.get("phone") or ""))
    db.commit()

    print("Migrating membership_types...")
    for row in sqlite_rows(conn, "membership_types"):
        db.add(
            MembershipType(
                id=row["id"], name=row["name"], duration_days=row["duration_days"] or 30,
                price=row["price"] or 0, description=row.get("description") or "",
            )
        )
    db.commit()

    print("Migrating promotions...")
    for row in sqlite_rows(conn, "promotions"):
        db.add(
            Promotion(
                id=row["id"],
                promotion_code=row["promotion_code"] or f"PROMO-{row['id']:04d}",
                promotion_name=row["promotion_name"] or row.get("title") or "",
                base_duration_value=row["base_duration_value"] or 0,
                base_duration_unit=row["base_duration_unit"] or "months",
                extra_duration_value=row["extra_duration_value"] or 0,
                extra_duration_unit=row["extra_duration_unit"] or "days",
                package_price=row["package_price"],
                applicable_membership_type=row.get("applicable_membership_type") or "",
                usage_limit=row["usage_limit"] or 0,
                used_count=row["used_count"] or row.get("usage_count") or 0,
                status=(row["status"] or "Inactive"),
                start_date=parse_date(row["start_date"]),
                end_date=parse_date(row["end_date"]),
            )
        )
    db.commit()

    print("Migrating members...")
    seen_codes: set[str] = set()
    migrated_member_ids: set[int] = set()
    for row in sqlite_rows(conn, "members"):
        code = row["member_code"] or f"PS-{row['id']:04d}"
        if code in seen_codes:
            disambiguated = f"{code}-DUP{row['id']}"
            print(f"  ! duplicate member_code {code!r} on member id={row['id']}, using {disambiguated!r}")
            code = disambiguated
        seen_codes.add(code)

        db.add(
            Member(
                id=row["id"], member_code=code, name=row["name"], email=row.get("email") or "",
                phone=row.get("phone") or "", membership_type=row["membership_type"] or "",
                join_date=parse_date(row["join_date"]), expiry_date=parse_date(row["expiry_date"]),
                days_left=row["days_left"] or 0, status=(row["status"] or "Pending for Approval"),
                remarks=row.get("remarks") or "", photo_url=row.get("photo_url") or "",
                branch=row.get("branch") or "", promotion_id=row.get("promotion_id"),
                promotion_applied=row.get("promotion_applied"),
            )
        )
        migrated_member_ids.add(row["id"])
    db.commit()

    def safe_member_id(raw_id: int | None, table: str) -> int | None:
        if raw_id is None:
            return None
        if raw_id not in migrated_member_ids:
            print(f"  ! {table} references missing member_id={raw_id}, setting to NULL")
            return None
        return raw_id

    print("Migrating approvals...")
    for row in sqlite_rows(conn, "approvals"):
        db.add(
            Approval(
                id=row["id"], member_id=safe_member_id(row.get("member_id"), "approvals"),
                name=row["name"] or "", email=row.get("email") or "", phone=row.get("phone") or "",
                request_type=row.get("request_type") or "New Member", membership_type=row.get("membership_type"),
                date=parse_date(row.get("date")), branch=row.get("branch") or "",
                status=(row["status"] or "Pending for Approval"), photo_url=row.get("photo_url") or "",
                promotion_id=row.get("promotion_id"), promotion_applied=row.get("promotion_applied"),
            )
        )
    db.commit()

    print("Migrating renewals...")
    for row in sqlite_rows(conn, "renewals"):
        db.add(
            Renewal(
                id=row["id"], member_id=safe_member_id(row.get("member_id"), "renewals"),
                member_code=row.get("member_code") or "", photo_url=row.get("photo_url") or "",
                request_date=parse_date(row.get("request_date")), processed_date=parse_date(row.get("processed_date")),
                status=(row["status"] or "Renewing"), bonus_days=row.get("bonus_days") or 0,
                remarks=row.get("remarks") or "", previous_end_date=parse_date(row.get("previous_end_date")),
                new_end_date=parse_date(row.get("new_end_date")), promotion_applied=row.get("promotion_applied"),
                promotion_id=row.get("promotion_id"), membership_type=row.get("membership_type"),
                approved_by=row.get("approved_by") or "", branch=row.get("branch") or "",
            )
        )
    db.commit()

    print("Migrating reports...")
    for row in sqlite_rows(conn, "reports"):
        db.add(
            Report(
                id=row["id"], type=row.get("type"), period_start=parse_date(row.get("period_start")),
                period_end=parse_date(row.get("period_end")), generated_at=parse_timestamp(row.get("generated_at")),
                data=row.get("data"),
            )
        )
    db.commit()

    print("Migrating walkins...")
    for row in sqlite_rows(conn, "walkins"):
        db.add(
            Walkin(
                id=row["id"], name=row.get("name") or "", phone=row.get("phone") or "", time=row.get("time") or "",
                purpose=row.get("purpose") or "", status=row.get("status") or "", converted=bool(row.get("converted")),
            )
        )
    db.commit()

    print("Migrating checkins...")
    for row in sqlite_rows(conn, "checkins"):
        scanned_at = parse_timestamp(row.get("scanned_at")) or datetime.now(timezone.utc)
        db.add(
            Checkin(
                id=row["id"], member_id=safe_member_id(row.get("member_id"), "checkins"),
                member_code=row.get("member_code") or "", scanned_at=scanned_at,
                branch=row.get("branch") or "", result=row.get("result"), notes=row.get("notes") or "",
            )
        )
    db.commit()

    print("Seeding users from the old hardcoded USERS array...")
    for u in LEGACY_USERS:
        db.add(User(username=u["username"], password_hash=hash_password(u["password"]), name=u["name"], role=u["role"], branch=u["branch"]))
    db.commit()

    print("Resetting sequences...")
    for table in ("branches", "membership_types", "promotions", "members", "approvals", "renewals", "reports", "walkins", "checkins", "users"):
        reset_sequence(db, table)
    db.commit()

    print("\nRow count verification (sqlite -> postgres):")
    for table in ("branches", "membership_types", "promotions", "members", "approvals", "renewals", "reports", "walkins", "checkins"):
        sqlite_count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        pg_count = db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
        flag = "OK" if sqlite_count == pg_count else "MISMATCH"
        print(f"  {table:20s} sqlite={sqlite_count:4d}  postgres={pg_count:4d}  [{flag}]")

    db.close()
    conn.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: python migrate_sqlite_to_pg.py <path-to-gym.db>")
        sys.exit(1)
    main(sys.argv[1])
