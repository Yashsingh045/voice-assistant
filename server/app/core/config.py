from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DEEPGRAM_API_KEY: str
    GROQ_API_KEY: str
    CARTESIA_API_KEY: str
    TAVILY_API_KEY: str
    REDIS_URL: str = "redis://localhost:6379"
    PORT: int = 8000

    class Config:
        env_file = ".env"

settings = Settings()
