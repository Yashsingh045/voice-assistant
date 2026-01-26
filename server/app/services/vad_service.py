import logging

logger = logging.getLogger(__name__)

class VADService:
    """
    Voice Activity Detection Service
    Uses webrtcvad if available, falls back to energy-based detection.
    """
    
    def __init__(self, mode: int = 1, sample_rate: int = 16000):
        """
        Initialize VAD service.
        
        Args:
            mode: Aggressiveness mode (0-3), 0 is least aggressive, 3 is most aggressive
            sample_rate: Audio sample rate in Hz (must be 8000, 16000, 32000, or 48000)
        """
        self.mode = mode
        self.sample_rate = sample_rate
        self.use_webrtc = False
        self.vad = None
        
        # Frame duration in milliseconds (10, 20, or 30 ms for webrtcvad)
        self.frame_duration_ms = 30
        self.frame_size = int(sample_rate * self.frame_duration_ms / 1000)
        
        # Energy-based VAD fallback parameters
        self.energy_threshold = 30  # More sensitive for quiet microphones
        
        # State tracking for logging
        self.last_speech_state = None
        self.speech_frame_count = 0
        self.silence_frame_count = 0
        
        try:
            import webrtcvad
            self.vad = webrtcvad.Vad(mode)
            self.use_webrtc = True
            logger.info(f"VAD initialized with webrtcvad (mode={mode}, sample_rate={sample_rate})")
        except ImportError:
            logger.warning("webrtcvad not available, falling back to energy-based VAD")
        except Exception as e:
            logger.error(f"Failed to initialize webrtcvad: {e}, using energy-based VAD")
    
    def is_speech(self, audio_chunk: bytes) -> bool:
        """
        Determine if the audio chunk contains speech.
        
        Args:
            audio_chunk: Raw PCM audio data (16-bit signed)
            
        Returns:
            True if speech is detected, False otherwise
        """
        if len(audio_chunk) == 0:
            return False
            
        if self.use_webrtc and self.vad:
            result = self._webrtc_is_speech(audio_chunk)
        else:
            result = self._energy_is_speech(audio_chunk)
        
        # Track state changes for logging
        if result:
            self.speech_frame_count += 1
            self.silence_frame_count = 0
            if self.last_speech_state != True:
                logger.info(f"[VAD] Speech started (mode={self.mode}, webrtc={self.use_webrtc})")
                self.last_speech_state = True
        else:
            self.silence_frame_count += 1
            self.speech_frame_count = 0
            if self.last_speech_state != False and self.silence_frame_count > 10:
                logger.info(f"[VAD] Silence detected")
                self.last_speech_state = False
        
        return result
    
    def _webrtc_is_speech(self, audio_chunk: bytes) -> bool:
        """
        Use webrtcvad for speech detection.
        """
        try:
            # webrtcvad requires specific frame sizes (10, 20, or 30ms)
            # If chunk is not the right size, we'll process what we can
            chunk_len = len(audio_chunk)
            bytes_per_frame = self.frame_size * 2  # 2 bytes per sample (16-bit)
            
            if chunk_len < bytes_per_frame:
                # Not enough data, consider it silence
                return False

            # Scan all full frames in this chunk; treat as speech if any frame is speech.
            for i in range(0, chunk_len - bytes_per_frame + 1, bytes_per_frame):
                frame = audio_chunk[i : i + bytes_per_frame]
                if self.vad.is_speech(frame, self.sample_rate):
                    return True
            return False
            
        except Exception as e:
            logger.error(f"WebRTC VAD error: {e}, falling back to energy-based detection")
            return self._energy_is_speech(audio_chunk)
    
    def _energy_is_speech(self, audio_chunk: bytes) -> bool:
        """
        Fallback energy-based speech detection.
        """
        try:
            import numpy as np
            
            # Convert bytes to int16 array
            audio_data = np.frombuffer(audio_chunk, dtype=np.int16)
            
            if len(audio_data) == 0:
                return False
            
            # Calculate energy (sum of squared samples)
            energy = np.sum(audio_data.astype(np.float32) ** 2) / len(audio_data)
            
            return energy > self.energy_threshold
            
        except Exception as e:
            logger.error(f"Energy-based VAD error: {e}")
            return True  # When in doubt, pass audio through
