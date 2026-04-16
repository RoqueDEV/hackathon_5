from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+psycopg://wmo:wmo_local_dev@postgres:5432/wmo"
    PSEUDONYM_SECRET: str = "local_dev_secret_change_me"
    CONFIDENCE_THRESHOLD: float = 0.7
    RETENTION_DAYS: int = 90
    FAIRNESS_BLOCKLIST_PATH: str = "/app/app/core/fairness_blocklist.yaml"
    LOG_LEVEL: str = "INFO"
    TESTING: bool = False


settings = Settings()
