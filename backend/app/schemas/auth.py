from app.schemas.common import ORMModel


class LoginRequest(ORMModel):
    username: str
    password: str


class UserOut(ORMModel):
    username: str
    name: str
    role: str
    branch: str | None = None


class TokenResponse(ORMModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
