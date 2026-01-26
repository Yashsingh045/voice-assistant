import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def sanitize_transcript(transcript: str) -> str:
    """
    Sanitize user transcript by removing potentially harmful content
    and limiting length.
    """
    if not transcript:
        return ""
    
    # Remove excessive whitespace
    transcript = re.sub(r'\s+', ' ', transcript.strip())
    
    # Limit length to prevent abuse
    if len(transcript) > 1000:
        transcript = transcript[:1000] + "..."
        logger.warning(f"Transcript truncated due to excessive length")
    
    # Remove potential script injections
    dangerous_patterns = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'on\w+\s*=',
    ]
    
    for pattern in dangerous_patterns:
        transcript = re.sub(pattern, '', transcript, flags=re.IGNORECASE)
    
    return transcript

def validate_session_id(session_id: Optional[str]) -> bool:
    """
    Validate session ID format.
    """
    if not session_id:
        return True  # Allow None (will be generated)
    
    # Should be a valid UUID or reasonable string
    if len(session_id) > 100:
        return False
    
    # Check for reasonable characters
    if not re.match(r'^[a-zA-Z0-9\-_]+$', session_id):
        return False
    
    return True

def sanitize_system_prompt(prompt: str) -> str:
    """
    Sanitize system prompt to prevent injection.
    """
    if not prompt:
        return ""
    
    # Limit prompt length
    if len(prompt) > 2000:
        prompt = prompt[:2000]
        logger.warning(f"System prompt truncated due to excessive length")
    
    # Remove potential system instruction overrides
    dangerous_patterns = [
        r'(?i)ignore\s+previous\s+instructions',
        r'(?i)disregard\s+above',
        r'(?i)new\s+role\s*:',
        r'(?i)you\s+are\s+now',
    ]
    
    for pattern in dangerous_patterns:
        prompt = re.sub(pattern, '[FILTERED]', prompt, flags=re.IGNORECASE)
    
    return prompt.strip()
