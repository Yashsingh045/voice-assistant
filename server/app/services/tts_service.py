import asyncio
import aiohttp
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class TTSService:
    """
    Text-to-Speech service using Deepgram Aura.
    Streams PCM audio at 16kHz for real-time playback.
    """
    
    def __init__(self):
        self.api_key = settings.DEEPGRAM_API_KEY
        self.voice = "aura-arcas-en"  # Male, calm voice
        self.base_url = "https://api.deepgram.com/v1/speak"
    
    async def stream_audio(self, text: str):
        """
        Stream TTS audio from Deepgram Aura.
        Buffers entire response for smoother playback.
        
        Args:
            text: Text to convert to speech
            
        Yields:
            bytes: PCM audio chunks (16-bit signed, 16kHz)
        """
        if not text or not text.strip():
            return
        
        headers = {
            "Authorization": f"Token {self.api_key}",
            "Content-Type": "application/json"
        }
        
        params = {
            "model": self.voice,
            "encoding": "linear16",
            "sample_rate": "16000"
        }
        
        max_retries = 2
        
        for attempt in range(max_retries):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        self.base_url,
                        headers=headers,
                        params=params,
                        json={"text": text}
                    ) as response:
                        if response.status == 200:
                            # Buffer larger chunks for smoother audio
                            buffer = b""
                            async for chunk in response.content.iter_chunked(8192):
                                if chunk:
                                    buffer += chunk
                                    # Send in larger chunks (minimum 16KB) for smoother playback
                                    while len(buffer) >= 16384:
                                        yield buffer[:16384]
                                        buffer = buffer[16384:]
                            # Send remaining buffer
                            if buffer:
                                yield buffer
                            return  # Success
                        else:
                            error_text = await response.text()
                            logger.error(f"Deepgram TTS error ({response.status}): {error_text}")
                            
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.error(f"TTS Error (Attempt {attempt + 1}): {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(0.5)
