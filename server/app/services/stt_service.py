import asyncio
from deepgram import DeepgramClient, LiveOptions, LiveTranscriptionEvents
from app.core.config import settings
import logging
import speech_recognition as sr
import io
import wave

logger = logging.getLogger(__name__)

class STTService:
    def __init__(self, websocket_callback):
        self.dg_client = DeepgramClient(settings.DEEPGRAM_API_KEY)
        self.callback = websocket_callback
        self.dg_connection = None
        self.deepgram_failed = False
        self.audio_buffer = []
        self.recognizer = sr.Recognizer()
        self.fallback_active = False

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
                    # Mark Deepgram as failed to activate fallback
                    self.deepgram_failed = True
                    if not self.fallback_active:
                        logger.warning("Activating SpeechRecognition fallback")
                        self.fallback_active = True

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
                    self.deepgram_failed = False
                    return True
                
            except Exception as e:
                logger.error(f"Deepgram connection attempt {attempt + 1} failed: {e}")
                self.deepgram_failed = True
            
            await asyncio.sleep(retry_delay)
            retry_delay *= 2
        
        # All Deepgram attempts failed, activate fallback
        logger.warning("All Deepgram attempts failed, using SpeechRecognition fallback")
        self.fallback_active = True
        return True  # Return True to continue with fallback

    async def send_audio(self, buffer):
        # Try Deepgram first if available
        if self.dg_connection and not self.deepgram_failed:
            try:
                self.dg_connection.send(buffer)
            except Exception as e:
                logger.error(f"Deepgram send failed: {e}")
                self.deepgram_failed = True
                self.fallback_active = True
        
        # Use SpeechRecognition fallback if Deepgram failed
        if self.fallback_active:
            self.audio_buffer.append(buffer)
            
            # Process buffer when it reaches ~2 seconds (32KB chunks at 16kHz)
            if len(self.audio_buffer) >= 60:  # ~2 seconds of audio
                await self._process_with_speech_recognition()
                self.audio_buffer = []

    async def _process_with_speech_recognition(self):
        """Process buffered audio with SpeechRecognition fallback."""
        try:
            # Combine audio buffer
            audio_data = b''.join(self.audio_buffer)
            
            # Create WAV file in memory
            wav_io = io.BytesIO()
            with wave.open(wav_io, 'wb') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(16000)  # 16kHz
                wav_file.writeframes(audio_data)
            
            wav_io.seek(0)
            
            # Convert to AudioData
            with sr.AudioFile(wav_io) as source:
                audio = self.recognizer.record(source)
            
            # Recognize speech using Google Speech Recognition
            loop = asyncio.get_event_loop()
            text = await loop.run_in_executor(
                None,
                self.recognizer.recognize_google,
                audio
            )
            
            if text:
                logger.info(f"SpeechRecognition fallback transcribed: {text}")
                await self.callback(text, is_final=True)
                
        except sr.UnknownValueError:
            logger.debug("SpeechRecognition could not understand audio")
        except sr.RequestError as e:
            logger.error(f"SpeechRecognition API error: {e}")
        except Exception as e:
            logger.error(f"SpeechRecognition fallback error: {e}")

    async def stop(self):
        if self.dg_connection:
            self.dg_connection.finish()
            self.dg_connection = None
        
        # Clear audio buffer
        self.audio_buffer = []
        self.fallback_active = False
        self.deepgram_failed = False
