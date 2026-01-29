import asyncio
import aiohttp
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class TTSService:
    """
    Text-to-Speech service with Deepgram primary and Cartesia fallback.
    Streams PCM audio at 16kHz for real-time playback.
    """
    
    def __init__(self):
        self.cartesia_api_key = settings.CARTESIA_API_KEY
        self.deepgram_api_key = settings.DEEPGRAM_API_KEY
        self.deepgram_voice = "aura-2-odysseus-en"
        self.cartesia_voice_id = "a0e99841-438c-4a64-b679-ae501e7d6091"
        self.deepgram_url = "https://api.deepgram.com/v1/speak"
        self.cartesia_url = "https://api.cartesia.ai/tts/bytes"
    
    async def stream_audio(self, text: str):
        """
        Stream TTS audio with Cartesia primary, Deepgram fallback.
        
        Args:
            text: Text to convert to speech
            
        Yields:
            bytes: PCM audio chunks (16-bit signed, 16kHz)
        """
        if not text or not text.strip():
            return
        
        # Try Deepgram first
        try:
            async for chunk in self._stream_cartesia(text):
                yield chunk
            return  # Success
        except Exception as e:
            logger.warning(f"Cartesia TTS failed, falling back to Deepgram: {e}")
        
        # Fallback to Deepgram
        try:
            async for chunk in self._stream_deepgram(text):
                yield chunk
        except Exception as e:
            logger.error(f"Both TTS providers failed: {e}")
    
    async def _stream_deepgram(self, text: str):
        """Stream audio from Deepgram Aura."""
        headers = {
            "Authorization": f"Token {self.deepgram_api_key}",
            "Content-Type": "application/json"
        }
        
        params = {
            "model": self.deepgram_voice,
            "encoding": "linear16",
            "sample_rate": "16000"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.deepgram_url,
                headers=headers,
                params=params,
                json={"text": text}
            ) as response:
                if response.status == 200:
                    buffer = b""
                    async for chunk in response.content.iter_chunked(8192):
                        if chunk:
                            buffer += chunk
                            while len(buffer) >= 16384:
                                yield buffer[:16384]
                                buffer = buffer[16384:]
                    if buffer:
                        yield buffer
                else:
                    error_text = await response.text()
                    raise Exception(f"Deepgram error ({response.status}): {error_text}")
    
    async def _stream_cartesia(self, text: str):
        """Stream audio from Cartesia AI (fallback)."""
        headers = {
            "X-API-Key": self.cartesia_api_key,
            "Cartesia-Version": "2024-06-10",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model_id": "sonic-english",
            "transcript": text,
            "voice": {
                "mode": "id",
                "id": self.cartesia_voice_id
            },
            "output_format": {
                "container": "raw",
                "encoding": "pcm_s16le",
                "sample_rate": 16000
            }
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.cartesia_url,
                headers=headers,
                json=payload
            ) as response:
                if response.status == 200:
                    buffer = b""
                    async for chunk in response.content.iter_chunked(8192):
                        if chunk:
                            buffer += chunk
                            while len(buffer) >= 16384:
                                yield buffer[:16384]
                                buffer = buffer[16384:]
                    if buffer:
                        yield buffer
                else:
                    error_text = await response.text()
                    raise Exception(f"Cartesia error ({response.status}): {error_text}")
