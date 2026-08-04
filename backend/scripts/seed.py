"""Seed base data for production: users, branches and membership types.

Usage (from the backend container):
    python -m scripts.seed                 # seed everything
    python -m scripts.seed --users         # seed only users
    python -m scripts.seed --branches      # seed only branches
    python -m scripts.seed --memberships   # seed only membership types

Safe to run repeatedly: existing rows are left untouched.
"""

import sys

from sqlalchemy import select

from app.database import SessionLocal
from app.models.branch import Branch
from app.models.membership_type import MembershipType
from app.models.user import User
from app.models.enums import UserRole
from app.security import hash_password

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


def main() -> None:
    args = set(sys.argv[1:])
    want_users = "--users" in args or not args
    want_branches = "--branches" in args or not args
    want_memberships = "--memberships" in args or not args

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
        db.commit()
        print("Done.")


if __name__ == "__main__":
    main()
