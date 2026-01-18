from cartesia import Cartesia
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class TTSService:
    def __init__(self):
        self.client = Cartesia(api_key=settings.CARTESIA_API_KEY)
        self.model_id = "sonic-english"
        self.voice_id = "79a125e8-cd45-4c13-8a67-01016a27e41c" # Baritone British

    async def stream_audio(self, text: str):
        try:
            # Cartesia streaming iterator
            output_format = {
                "container": "raw",
                "encoding": "pcm_s16le",
                "sample_rate": 44100,
            }

            for output in self.client.tts.sse(
                model_id=self.model_id,
                transcript=text,
                voice_id=self.voice_id,
                output_format=output_format,
            ):
                yield output["audio"]
        except Exception as e:
            logger.error(f"Cartesia Error: {e}")
