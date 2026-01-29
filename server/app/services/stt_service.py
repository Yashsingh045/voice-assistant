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
        self.loop = asyncio.get_running_loop()
        
        for attempt in range(max_retries):
            try:
                # Initialize new connection
                self.dg_connection = self.dg_client.listen.live.v("1")

                def on_message(self_inner, result, **kwargs):
                    sentence = result.channel.alternatives[0].transcript
                    if len(sentence) > 0:
                        try:
                            asyncio.run_coroutine_threadsafe(
                                self.callback(sentence, result.is_final), 
                                self.loop
                            )
                        except Exception as e:
                            logger.error(f"STT callback error: {e}")

                def on_error(self_inner, error, **kwargs):
                    logger.error(f"Deepgram Connection Error: {error}")
                    # For AI STT, errors are non-critical - just log and continue
                    if "ai_stt" in str(self_inner):
                        logger.warning("AI STT connection error (non-critical)")
                    else:
                        logger.error("User STT connection error")

                self.dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
                self.dg_connection.on(LiveTranscriptionEvents.Error, on_error)

                options = LiveOptions(
                    model="nova-2-general",
                    language="en-US",
                    smart_format=True,
                    encoding="linear16",
                    channels=1,
                    sample_rate=16000,
                    interim_results=True,
                    endpointing=500,
                    # Disable VAD for AI voice detection
                    vad_events=False,
                )
                
                if self.dg_connection.start(options) is not False:
                    logger.info("Deepgram connection established")
                    return True
                
            except Exception as e:
                logger.error(f"Deepgram connection attempt {attempt + 1} failed: {e}")
            
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
