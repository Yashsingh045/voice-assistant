import re
import logging
from typing import List, Set

logger = logging.getLogger(__name__)


class SmartSentenceBuffer:
    """
    Context-aware sentence buffer that handles abbreviations, decimals, URLs, and file paths.
    Prevents premature sentence splitting on non-sentence-ending punctuation.
    """
    
    # Common abbreviations that end with periods but don't end sentences
    ABBREVIATIONS: Set[str] = {
        "Dr.", "Mr.", "Mrs.", "Ms.", "Prof.", "Sr.", "Jr.",
        "U.S.", "U.K.", "U.S.A.", "U.K.", "E.U.",
        "etc.", "vs.", "e.g.", "i.e.", "Inc.", "Ltd.", "Corp.",
        "St.", "Ave.", "Blvd.", "Rd.", "Dept.", "Gov.",
        "a.m.", "p.m.", "A.M.", "P.M."
    }
    
    # Sentence-ending punctuation marks
    SENTENCE_ENDINGS: Set[str] = {".", "!", "?"}
    
    # Maximum buffer size before forcing a sentence break (safety limit)
    MAX_BUFFER_SIZE: int = 2000
    
    def __init__(self):
        """Initialize the smart sentence buffer."""
        self.buffer = ""
        self.completed_sentences: List[str] = []
    
    def add_chunk(self, chunk: str) -> List[str]:
        """
        Add text chunk to buffer and return any complete sentences detected.
        
        Args:
            chunk: Text chunk from streaming LLM
            
        Returns:
            List of complete sentences ready for TTS processing
        """
        if not chunk:
            return []
        
        self.buffer += chunk
        
        # Check for buffer overflow
        if len(self.buffer) > self.MAX_BUFFER_SIZE:
            logger.warning(f"Buffer overflow detected ({len(self.buffer)} chars), forcing sentence break")
            return self._force_sentence_break()
        
        # Extract complete sentences
        return self.extract_complete_sentences()
    
    def extract_complete_sentences(self) -> List[str]:
        """
        Extract and return complete sentences from the buffer.
        Uses context-aware detection to avoid premature splits.
        
        Returns:
            List of complete sentences
        """
        sentences = []
        
        while True:
            sentence_end = self._find_sentence_boundary()
            
            if sentence_end == -1:
                # No complete sentence found
                break
            
            # Extract the sentence (including the ending punctuation)
            sentence = self.buffer[:sentence_end + 1].strip()
            
            if sentence:
                sentences.append(sentence)
                logger.debug(f"Extracted sentence: {sentence[:50]}...")
            
            # Remove the extracted sentence from buffer
            self.buffer = self.buffer[sentence_end + 1:].lstrip()
        
        return sentences
    
    def _find_sentence_boundary(self) -> int:
        """
        Find the position of the next sentence boundary in the buffer.
        Returns -1 if no complete sentence is found.
        
        Returns:
            Position of sentence-ending punctuation, or -1 if none found
        """
        # Look for sentence-ending punctuation
        for i, char in enumerate(self.buffer):
            if char in self.SENTENCE_ENDINGS:
                if self._is_sentence_complete(i):
                    return i
        
        return -1
    
    def _is_sentence_complete(self, position: int) -> bool:
        """
        Determine if punctuation at the given position actually ends a sentence.
        Uses context analysis to distinguish sentence endings from abbreviations, decimals, etc.
        
        Args:
            position: Position of punctuation mark in buffer
            
        Returns:
            True if this punctuation ends a sentence, False otherwise
        """
        if position < 0 or position >= len(self.buffer):
            return False
        
        char = self.buffer[position]
        
        # Only consider sentence-ending punctuation
        if char not in self.SENTENCE_ENDINGS:
            return False
        
        # For ! and ?, always consider them sentence endings
        if char in {"!", "?"}:
            return True
        
        # For periods, we need more context analysis
        if char == ".":
            # Check if it's part of an abbreviation
            if self._is_abbreviation(position):
                return False
            
            # Check if it's part of a decimal number
            if self._is_decimal_number(position):
                return False
            
            # Check if it's part of a URL or file path
            if self._is_url_or_path(position):
                return False
            
            # Check if there's more text after the period
            # If there's no space after the period, it's likely not a sentence ending
            if position + 1 < len(self.buffer):
                next_char = self.buffer[position + 1]
                
                # Period followed by space and uppercase letter is likely a sentence ending
                if next_char == " " and position + 2 < len(self.buffer):
                    char_after_space = self.buffer[position + 2]
                    if char_after_space.isupper():
                        return True
                
                # Period followed by newline is a sentence ending
                if next_char == "\n":
                    return True
                
                # Period not followed by space is likely not a sentence ending
                if next_char != " ":
                    return False
            
            # Conservative approach: if uncertain, wait for more context
            # Only consider it a sentence ending if we have clear indicators
            return self._has_sentence_ending_indicators(position)
        
        return False
    
    def _is_abbreviation(self, position: int) -> bool:
        """Check if the period at position is part of a known abbreviation."""
        # Look back up to 10 characters to find potential abbreviation
        start = max(0, position - 10)
        context = self.buffer[start:position + 1]
        
        # Check against known abbreviations
        for abbr in self.ABBREVIATIONS:
            if context.endswith(abbr):
                return True
        
        # Check for single-letter abbreviations (e.g., "A. Smith")
        if position >= 1:
            if self.buffer[position - 1].isupper() and (position == 1 or self.buffer[position - 2] == " "):
                return True
        
        return False
    
    def _is_decimal_number(self, position: int) -> bool:
        """Check if the period at position is part of a decimal number."""
        # Check if there are digits before and after the period
        has_digit_before = position > 0 and self.buffer[position - 1].isdigit()
        has_digit_after = position + 1 < len(self.buffer) and self.buffer[position + 1].isdigit()
        
        return has_digit_before and has_digit_after
    
    def _is_url_or_path(self, position: int) -> bool:
        """Check if the period at position is part of a URL or file path."""
        # Look for URL patterns (http://, https://, www., .com, .org, etc.)
        context_before = self.buffer[max(0, position - 20):position + 1].lower()
        context_after = self.buffer[position:min(len(self.buffer), position + 20)].lower()
        
        # Check for URL indicators
        url_indicators = ["http://", "https://", "www.", "://"]
        for indicator in url_indicators:
            if indicator in context_before or indicator in context_after:
                return True
        
        # Check for common domain extensions
        domain_extensions = [".com", ".org", ".net", ".edu", ".gov", ".io", ".ai", ".co"]
        for ext in domain_extensions:
            if context_after.startswith(ext):
                return True
        
        # Check for file path patterns (e.g., /path/to/file.txt or C:\path\file.txt)
        if "/" in context_before or "\\" in context_before:
            # Look for file extensions
            if position + 1 < len(self.buffer) and position + 4 < len(self.buffer):
                potential_ext = self.buffer[position:position + 4].lower()
                if potential_ext in [".txt", ".pdf", ".doc", ".jpg", ".png", ".py", ".js", ".ts"]:
                    return True
        
        return False
    
    def _has_sentence_ending_indicators(self, position: int) -> bool:
        """
        Check if there are clear indicators that this is a sentence ending.
        Conservative approach: only return True if we're confident.
        """
        # If we're at the end of the buffer, we need more context
        if position + 1 >= len(self.buffer):
            return False
        
        # Check what comes after the period
        remaining = self.buffer[position + 1:].lstrip()
        
        if not remaining:
            # Nothing after the period (yet), wait for more context
            return False
        
        # If the next character is uppercase, it's likely a new sentence
        if remaining[0].isupper():
            return True
        
        # If there's a newline, it's a sentence ending
        if self.buffer[position + 1] == "\n":
            return True
        
        return False
    
    def _force_sentence_break(self) -> List[str]:
        """
        Force a sentence break when buffer is too large.
        Tries to break at a reasonable point (space or punctuation).
        """
        # Try to find a good break point (last space or punctuation)
        break_point = -1
        
        for i in range(len(self.buffer) - 1, max(0, len(self.buffer) - 200), -1):
            if self.buffer[i] in {" ", ".", "!", "?", ",", ";"}:
                break_point = i
                break
        
        if break_point == -1:
            # No good break point found, just break at max size
            break_point = self.MAX_BUFFER_SIZE
        
        sentence = self.buffer[:break_point + 1].strip()
        self.buffer = self.buffer[break_point + 1:].lstrip()
        
        logger.warning(f"Forced sentence break at {break_point}: {sentence[:50]}...")
        return [sentence] if sentence else []
    
    def get_remaining_buffer(self) -> str:
        """
        Get any remaining text in the buffer.
        Useful for flushing the buffer at the end of a response.
        
        Returns:
            Remaining buffer content
        """
        return self.buffer.strip()
    
    def clear_buffer(self):
        """Clear the buffer completely."""
        self.buffer = ""
        self.completed_sentences = []
    
    def flush(self) -> List[str]:
        """
        Flush the buffer and return any remaining text as a sentence.
        Used at the end of a response to ensure all text is processed.
        
        Returns:
            List containing the remaining buffer content as a sentence
        """
        if self.buffer.strip():
            sentence = self.buffer.strip()
            self.buffer = ""
            logger.debug(f"Flushed remaining buffer: {sentence[:50]}...")
            return [sentence]
        return []
