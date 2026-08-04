from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://gym:gym@localhost:5433/gym"
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 480
    cors_origins: str = "http://localhost:5173"
    port: int = 8000

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
