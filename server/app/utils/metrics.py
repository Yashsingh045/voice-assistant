import time
from functools import wraps
import logging

logger = logging.getLogger(__name__)

class MetricsTracker:
    def __init__(self):
        self.metrics = {}
        self.tokens_count = 0
        self.model_name = "Llama 3.3 70B" # Default

    def set_model(self, model: str):
        self.model_name = model

    def start_timing(self, name: str):
        self.metrics[name] = {"start": time.time()}

    def stop_timing(self, name: str):
        if name in self.metrics and "start" in self.metrics[name]:
            duration = (time.time() - self.metrics[name]["start"]) * 1000 # convert to ms
            self.metrics[name]["duration"] = duration
            return duration
        return 0

    def add_tokens(self, count: int):
        self.tokens_count += count

    def get_tps(self):
        # Calculate TPS based on llm_generation duration
        gen_duration = self.metrics.get("llm_generation", {}).get("duration", 0)
        if gen_duration > 0:
            return (self.tokens_count / (gen_duration / 1000))
        return 0

    def get_all(self):
        data = {k: v.get("duration", 0) for k, v in self.metrics.items()}
        data["tps"] = self.get_tps()
        data["model"] = self.model_name
        return data

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
