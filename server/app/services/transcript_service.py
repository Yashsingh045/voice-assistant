import logging
from typing import Literal
from app.services.history_service import HistoryService

logger = logging.getLogger(__name__)


class TranscriptService:
    """
    Service for managing conversation transcripts with source tracking.
    Stores agent messages using original LLM text for 100% accuracy.
    """
    
    def __init__(self, history_service: HistoryService):
        """
        Initialize TranscriptService with existing HistoryService.
        
        Args:
            history_service: Existing HistoryService instance for session management
        """
        self.history_service = history_service
    
    async def store_agent_message(self, session_id: str, text: str):
        """
        Store agent message using original LLM text.
        This ensures 100% transcript accuracy by avoiding re-transcription.
        
        Args:
            session_id: Unique session identifier
            text: Original LLM output text
        """
        try:
            if not text or not text.strip():
                logger.warning(f"Attempted to store empty agent message for session {session_id}")
                return
            
            # Store with "assistant" role to match LLM conversation format
            await self.history_service.add_message(session_id, "assistant", text.strip())
            logger.debug(f"Stored agent message for session {session_id}: {text[:50]}...")
            
        except Exception as e:
            logger.error(f"Error storing agent message for session {session_id}: {e}")
    
    async def store_user_message(self, session_id: str, text: str):
        """
        Store user message from STT.
        
        Args:
            session_id: Unique session identifier
            text: Transcribed user speech from STT
        """
        try:
            if not text or not text.strip():
                logger.warning(f"Attempted to store empty user message for session {session_id}")
                return
            
            # Store with "user" role
            await self.history_service.add_message(session_id, "user", text.strip())
            logger.debug(f"Stored user message for session {session_id}: {text[:50]}...")
            
        except Exception as e:
            logger.error(f"Error storing user message for session {session_id}: {e}")
    
    async def get_conversation_history(self, session_id: str, limit: int = 10):
        """
        Retrieve conversation history for a session.
        
        Args:
            session_id: Unique session identifier
            limit: Maximum number of messages to retrieve
            
        Returns:
            List of message dictionaries with 'role' and 'content' keys
        """
        try:
            return await self.history_service.get_history(session_id, limit)
        except Exception as e:
            logger.error(f"Error retrieving conversation history for session {session_id}: {e}")
            return []
    
    async def clear_conversation(self, session_id: str):
        """
        Clear all conversation history for a session.
        
        Args:
            session_id: Unique session identifier
        """
        try:
            await self.history_service.clear_history(session_id)
            logger.info(f"Cleared conversation history for session {session_id}")
        except Exception as e:
            logger.error(f"Error clearing conversation history for session {session_id}: {e}")
