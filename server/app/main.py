from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.websocket import router as ws_router
from app.core.config import settings
from app.core.logger import setup_logging
import logging

setup_logging()
logger = logging.getLogger(__name__)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic can go here
    yield
    # Shutdown logic: ensuring any global resources are cleared
    logger.info("Shutting down cleanly...")

app = FastAPI(title="Voice Assistant API", lifespan=lifespan)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ws_router)

if __name__ == "__main__":
    import uvicorn
    # When running directly as a script (python app/main.py), 
    # the module name is just 'main' vs 'app.main'
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
