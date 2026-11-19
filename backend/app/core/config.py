from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql://sentinel:sentinel@localhost:5432/sentinel_db"
    REDIS_URL: str = "redis://localhost:6379"
    SECRET_KEY: str = "change-this-to-a-long-random-string-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ML_SERVICE_URL: str = "http://localhost:8001"
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    LLM_PROVIDER: str = "gemini"
    NVIDIA_API_KEY: str = ""
    NVIDIA_MODEL: str = "meta/llama-3.1-70b-instruct"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"


settings = Settings()
