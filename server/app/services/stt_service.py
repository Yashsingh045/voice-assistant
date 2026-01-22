import asyncio
from deepgram import DeepgramClient, LiveOptions, LiveTranscriptionEvents
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class STTService:
    def __init__(self, websocket_callback):
        self.dg_client = DeepgramClient(settings.DEEPGRAM_API_KEY)
        self.callback = websocket_callback
        self.dg_connection = None

    async def start(self):
        max_retries = 3
        retry_delay = 1
        
        for attempt in range(max_retries):
            try:
                self.dg_connection = self.dg_client.listen.live.v("1")

                def on_message(self, result, **kwargs):
                    sentence = result.channel.alternatives[0].transcript
                    if len(sentence) > 0:
                        asyncio.run_coroutine_threadsafe(self.callback(sentence, result.is_final), asyncio.get_event_loop())

                def on_error(self, error, **kwargs):
                    logger.error(f"Deepgram Error: {error}")

                self.dg_connection.on(LiveTranscriptionEvents.TranscriptReceived, on_message)
                self.dg_connection.on(LiveTranscriptionEvents.Error, on_error)

                options = LiveOptions(
                    model="nova-2",
                    language="en-US",
                    smart_format=True,
                    encoding="linear16",
                    channels=1,
                    sample_rate=16000,
                    interim_results=True,
                )
                
                if self.dg_connection.start(options) is not False:
                    logger.info("Deepgram connection started successfully")
                    return True
                
                logger.warning(f"Deepgram start attempt {attempt + 1} failed")
            except Exception as e:
                logger.error(f"Deepgram start attempt {attempt + 1} error: {e}")
            
            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay)
                retry_delay *= 2
                
        return False

    async def send_audio(self, buffer):
        if self.dg_connection:
            self.dg_connection.send(buffer)

    async def stop(self):
        if self.dg_connection:
            self.dg_connection.finish()
            self.dg_connection = None
