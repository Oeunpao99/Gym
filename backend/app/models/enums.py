import enum

from sqlalchemy import Enum as SAEnum


def str_enum(enum_cls, length: int) -> SAEnum:
    """SQLAlchemy Enum column that stores the enum's `.value` (e.g. "Active") rather
    than its `.name` (e.g. "ACTIVE"), which is the default - keeps the raw Postgres
    data readable and matching the original app's stored strings exactly."""
    return SAEnum(enum_cls, native_enum=False, length=length, values_callable=lambda cls: [e.value for e in cls])


class MemberStatus(str, enum.Enum):
    ACTIVE = "Active"
    PENDING = "Pending for Approval"
    EXPIRE = "Expire"
    RENEWING = "Renewing"


class ApprovalStatus(str, enum.Enum):
    PENDING = "Pending for Approval"
    APPROVED = "Approved"
    REJECTED = "Rejected"


class RenewalStatus(str, enum.Enum):
    RENEWING = "Renewing"
    APPROVED = "Approved"


class PromotionStatus(str, enum.Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"
    EXPIRED = "Expired"


class UserRole(str, enum.Enum):
    BRANCH_MANAGER = "Branch Manager"
    HEAD_OFFICE = "Head Office"
    CEO = "CEO"


class ScanResult(str, enum.Enum):
    ALLOWED = "allowed"
    EXPIRED = "expired"
    BLOCKED = "blocked"
    NOT_FOUND = "not_found"
