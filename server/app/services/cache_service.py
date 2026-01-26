import redis.asyncio as redis
import hashlib
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class CacheService:
    def __init__(self):
        self.pool = redis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True, max_connections=10)
        self.redis = redis.Redis(connection_pool=self.pool)
        self.expiry = 3600 * 24 # 24 hours cache expiry
        self.version = "v1"

    def _get_key(self, query: str, context: str = ""):
        # Include version and hash query + context
        combined = f"{query}:{context}"
        hash_val = hashlib.md5(combined.encode()).hexdigest()
        return f"cache:{self.version}:{hash_val}"

    async def get_cached_response(self, query: str, context: str = ""):
        try:
            key = self._get_key(query, context)
            return await self.redis.get(key)
        except Exception as e:
            logger.error(f"Redis cache get error: {e}")
            return None

    async def set_cached_response(self, query: str, response: str, context: str = ""):
        try:
            key = self._get_key(query, context)
            await self.redis.setex(key, self.expiry, response)
        except Exception as e:
            logger.error(f"Redis cache set error: {e}")
