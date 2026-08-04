from app.schemas.common import ORMModel


class WalkinIn(ORMModel):
    name: str
    phone: str | None = ""
    time: str | None = ""
    purpose: str | None = ""
    status: str | None = ""
    converted: bool = False


class WalkinOut(WalkinIn):
    id: int
