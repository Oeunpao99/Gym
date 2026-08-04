from datetime import date, datetime

from app.schemas.common import ORMModel


class ReportIn(ORMModel):
    type: str | None = None
    period_start: date | None = None
    period_end: date | None = None
    generated_at: datetime | None = None
    data: str | None = None


class ReportOut(ReportIn):
    id: int
