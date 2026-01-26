import redis.asyncio as redis
import json
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class HistoryService:
    def __init__(self):
        self.pool = redis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True, max_connections=10)
        self.redis = redis.Redis(connection_pool=self.pool)
        self.expiry = 3600 # 1 hour session expiry

    async def add_message(self, session_id: str, role: str, content: str):
        try:
            message = {"role": role, "content": content}
            await self.redis.rpush(f"session:{session_id}", json.dumps(message))
            await self.redis.expire(f"session:{session_id}", self.expiry)
        except Exception as e:
            logger.error(f"Redis add_message error: {e}")

    async def get_history(self, session_id: str, limit: int = 10):
        try:
            messages = await self.redis.lrange(f"session:{session_id}", -limit, -1)
            return [json.loads(m) for m in messages]
        except Exception as e:
            logger.error(f"Redis get_history error: {e}")
            return []

    async def clear_history(self, session_id: str):
        try:
            await self.redis.delete(f"session:{session_id}")
        except Exception as e:
            logger.error(f"Redis clear_history error: {e}")
