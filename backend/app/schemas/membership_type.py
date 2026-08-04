from app.schemas.common import ORMModel


class MembershipTypeIn(ORMModel):
    name: str
    duration_days: int = 30
    price: float = 0
    description: str | None = ""


class MembershipTypeOut(MembershipTypeIn):
    id: int
