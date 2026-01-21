import redis
import hashlib
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class CacheService:
    def __init__(self):
        self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.expiry = 3600 * 24 # 24 hours cache expiry

    def _get_key(self, query: str, context: str = ""):
        # Simple hash of query + some context (like persona/instructions)
        combined = f"{query}:{context}"
        return f"cache:{hashlib.md5(combined.encode()).hexdigest()}"

    def get_cached_response(self, query: str, context: str = ""):
        try:
            key = self._get_key(query, context)
            return self.redis.get(key)
        except Exception as e:
            logger.error(f"Redis cache get error: {e}")
            return None

    def set_cached_response(self, query: str, response: str, context: str = ""):
        try:
            key = self._get_key(query, context)
            self.redis.setex(key, self.expiry, response)
        except Exception as e:
            logger.error(f"Redis cache set error: {e}")
