import numpy as np

def apply_noise_gate(audio_data: np.ndarray, threshold: float = 0.008) -> np.ndarray:
    """
    Applies a simple noise gate to the audio signal.
    Samples with amplitude below the threshold are zeroed out.
    """
    # Normalize data if it's int16
    if audio_data.dtype == np.int16:
        float_data = audio_data.astype(np.float32) / 32768.0
    else:
        float_data = audio_data

    # Apply a soft gate (attenuate instead of hard-zero) to avoid killing quiet speech
    mask = np.abs(float_data) < threshold
    float_data[mask] = float_data[mask] * 0.2
    
    # Convert back to int16 if needed
    if audio_data.dtype == np.int16:
        return (float_data * 32767.0).astype(np.int16)
    return float_data

def apply_high_pass_filter(audio_data: np.ndarray, cutoff: int = 200, fs: int = 16000) -> np.ndarray:
    """
    Simple high-pass filter using FFT to remove low-frequency hum/noise.
    """
    fft_data = np.fft.rfft(audio_data)
    freqs = np.fft.rfftfreq(len(audio_data), 1/fs)
    
    # Zero out frequencies below the cutoff
    fft_data[freqs < cutoff] = 0
    
    return np.fft.irfft(fft_data).astype(audio_data.dtype)

def process_audio_chunk(chunk_bytes: bytes) -> bytes:
    """
    Applies custom noise suppression and filtering to a raw PCM chunk.
    """
    # Convert bytes to numpy array (assuming 16-bit PCM)
    audio_data = np.frombuffer(chunk_bytes, dtype=np.int16)
    
    # Apply filters
    audio_data = apply_high_pass_filter(audio_data)
    audio_data = apply_noise_gate(audio_data)
    
    return audio_data.tobytes()
