import time
from functools import wraps
import logging

logger = logging.getLogger(__name__)

class MetricsTracker:
    def __init__(self):
        self.metrics = {}

    def start_timing(self, name: str):
        self.metrics[name] = {"start": time.time()}

    def stop_timing(self, name: str):
        if name in self.metrics and "start" in self.metrics[name]:
            duration = (time.time() - self.metrics[name]["start"]) * 1000 # convert to ms
            self.metrics[name]["duration"] = duration
            return duration
        return 0

    def get_all(self):
        return {k: v.get("duration", 0) for k, v in self.metrics.items()}

def time_it(name: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start = time.time()
            result = await func(*args, **kwargs)
            duration = (time.time() - start) * 1000
            logger.info(f"Metric [{name}]: {duration:.2f}ms")
            return result
        return wrapper
    return decorator
