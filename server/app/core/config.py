from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path

class Settings(BaseSettings):
    DEEPGRAM_API_KEY: str
    GROQ_API_KEY: str
    CARTESIA_API_KEY: str
    TAVILY_API_KEY: str
    GOOGLE_API_KEY: Optional[str] = None
    REDIS_URL: str = "redis://localhost:6379"
    PORT: int = 8000

    class Config:
        _here = Path(__file__).resolve()
        env_file = (
            str(_here.parents[2] / ".env"),  # server/.env
            str(_here.parents[3] / ".env"),  # repo-root/.env
        )

settings = Settings()
