from app.schemas.common import ORMModel


class BranchIn(ORMModel):
    code: str | None = None
    name: str
    address: str | None = ""
    phone: str | None = ""


class BranchOut(BranchIn):
    id: int
