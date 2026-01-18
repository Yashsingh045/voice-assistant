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
        
        if self.dg_connection.start(options) is False:
            logger.error("Failed to start Deepgram connection")
            return False
        return True

    async def send_audio(self, buffer):
        if self.dg_connection:
            self.dg_connection.send(buffer)

    async def stop(self):
        if self.dg_connection:
            self.dg_connection.finish()
            self.dg_connection = None
