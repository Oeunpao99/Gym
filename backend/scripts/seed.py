"""Seed base data for production: users, branches, membership types and demo members.

Usage (from the backend container):
    python -m scripts.seed                 # seed everything
    python -m scripts.seed --users         # seed only users
    python -m scripts.seed --branches      # seed only branches
    python -m scripts.seed --memberships   # seed only membership types
    python -m scripts.seed --members       # seed only demo members

Safe to run repeatedly: existing table data is left untouched (members are only
seeded when the members table is empty).
"""

import sys
from datetime import timedelta
from uuid import uuid4

from sqlalchemy import select

from app.database import SessionLocal
from app.models.branch import Branch
from app.models.member import Member
from app.models.membership_type import MembershipType
from app.models.user import User
from app.models.enums import MemberStatus, UserRole
from app.security import hash_password
from app.services.dates import today
from app.services.member_codes import make_member_code

USERS = [
    {
        "username": "branch1",
        "password": "branch123",
        "name": "Downtown Manager",
        "role": UserRole.BRANCH_MANAGER,
        "branch": "Downtown",
    },
    {
        "username": "branch2",
        "password": "branch123",
        "name": "Uptown Manager",
        "role": UserRole.BRANCH_MANAGER,
        "branch": "P'Sa Jas",
    },
    {
        "username": "headoffice",
        "password": "head123",
        "name": "Head Office",
        "role": UserRole.HEAD_OFFICE,
        "branch": "Head Office",
    },
    {
        "username": "ceo",
        "password": "ceo123",
        "name": "CEO",
        "role": UserRole.CEO,
        "branch": "All Branches",
    },
]

BRANCHES = [
    {"code": "BR-001", "name": "Downtown", "address": "123 Main St", "phone": "(555) 000-1111"},
    {"code": "BR-002", "name": "P'Sa Jas", "address": "456 High St", "phone": "(555) 222-3333"},
    {"code": "BR-003", "name": "Jbar Ampov", "address": "Kampot", "phone": "064664644"},
]

MEMBERSHIP_TYPES = [
    {"name": "1M", "duration_days": 30, "price": 29.99, "description": "1 month membership"},
    {"name": "3M", "duration_days": 90, "price": 79.99, "description": "3 months membership"},
    {"name": "6M", "duration_days": 180, "price": 149.99, "description": "6 months membership"},
    {"name": "1Y", "duration_days": 365, "price": 249.99, "description": "12 months membership"},
    {"name": "Free", "duration_days": 30, "price": 0.0, "description": "Complimentary membership"},
]

MEMBERS_PER_BRANCH = 20

SAMPLE_NAMES = [
    "Sokha Chan",
    "Vathana Kim",
    "Rithy Tan",
    "Dara Sok",
    "Bopha Chen",
    "Kosal Heng",
    "Sreypov Lim",
    "Meng Huoy",
    "Davin Prak",
    "Chamroeun Sun",
    "Sovannary Yim",
    "Pisey Nget",
    "Visal Run",
    "Chenda Phon",
    "Ratana Ouk",
    "Veasna Kour",
    "Sokunthea Lay",
    "Narith Both",
    "Dalis Huy",
    "Kunthea Meas",
]


def seed_users(db) -> int:
    count = 0
    for item in USERS:
        exists = db.execute(
            select(User).where(User.username == item["username"])
        ).scalar_one_or_none()
        if exists:
            print(f"  skip user '{item['username']}' (already exists)")
            continue
        db.add(
            User(
                username=item["username"],
                password_hash=hash_password(item["password"]),
                name=item["name"],
                role=item["role"],
                branch=item["branch"],
            )
        )
        count += 1
    return count


def seed_branches(db) -> int:
    count = 0
    for item in BRANCHES:
        exists = db.execute(
            select(Branch).where(Branch.code == item["code"])
        ).scalar_one_or_none()
        if exists:
            print(f"  skip branch '{item['name']}' (already exists)")
            continue
        db.add(Branch(**item))
        count += 1
    return count


def seed_membership_types(db) -> int:
    count = 0
    for item in MEMBERSHIP_TYPES:
        exists = db.execute(
            select(MembershipType).where(MembershipType.name == item["name"])
        ).scalar_one_or_none()
        if exists:
            print(f"  skip membership type '{item['name']}' (already exists)")
            continue
        db.add(MembershipType(**item))
        count += 1
    return count


def membership_type_name(membership_types: list[MembershipType], index: int) -> str:
    return membership_types[index % len(membership_types)].name


def expiry_offset_for(index: int) -> int:
    if index >= 18:
        return -12 - (index % 2) * 23
    if index >= 16:
        return 1 + (index % 2) * 4
    return 30 + (index * 11) % 250


def seed_members(db) -> int:
    existing = db.execute(select(Member.id).limit(1)).scalar_one_or_none()
    if existing is not None:
        print("  skip members (table already has data)")
        return 0

    branches = list(db.execute(select(Branch).order_by(Branch.id)).scalars())
    membership_types = list(
        db.execute(select(MembershipType).order_by(MembershipType.id)).scalars()
    )
    if not branches or not membership_types:
        print("  skip members (seed branches and membership types first)")
        return 0

    count = 0
    person_counter = 0
    today_date = today()
    for branch in branches:
        for index in range(MEMBERS_PER_BRANCH):
            plan_name = membership_type_name(membership_types, index)
            plan = next(
                (mt for mt in membership_types if mt.name == plan_name), None
            )
            duration_days = plan.duration_days if plan else 30
            offset = expiry_offset_for(index)
            join_date = today_date - timedelta(days=duration_days - offset)
            expiry_date = today_date + timedelta(days=offset)
            name = SAMPLE_NAMES[index % len(SAMPLE_NAMES)]
            first, _, last = name.partition(" ")
            email = f"{first.lower()}.{last.lower()}@example.com"
            phone = f"012 {3300 + person_counter:04d}"
            person_counter += 1

            member = Member(
                member_code=f"SEED-{uuid4().hex[:10]}",
                name=name,
                email=email,
                phone=phone,
                membership_type=plan_name,
                join_date=join_date,
                expiry_date=expiry_date,
                days_left=max(0, offset),
                status=MemberStatus.ACTIVE,
                remarks="",
                photo_url="",
                branch=branch.name,
            )
            db.add(member)
            db.flush()
            member.member_code = make_member_code(member.id)
            member.photo_url = f"https://i.pravatar.cc/300?u={member.member_code}"
            count += 1
    return count


def main() -> None:
    args = set(sys.argv[1:])
    want_users = "--users" in args or not args
    want_branches = "--branches" in args or not args
    want_memberships = "--memberships" in args or not args
    want_members = "--members" in args or not args

    with SessionLocal() as db:
        if want_users:
            print("Seeding users ...")
            n = seed_users(db)
            print(f"  inserted {n} user(s)")
        if want_branches:
            print("Seeding branches ...")
            n = seed_branches(db)
            print(f"  inserted {n} branch(es)")
        if want_memberships:
            print("Seeding membership types ...")
            n = seed_membership_types(db)
            print(f"  inserted {n} membership type(s)")
        if want_members:
            print("Seeding members ...")
            n = seed_members(db)
            print(f"  inserted {n} member(s)")
        db.commit()
        print("Done.")


if __name__ == "__main__":
    main()
