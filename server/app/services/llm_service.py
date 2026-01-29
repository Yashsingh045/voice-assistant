from groq import AsyncGroq
import google.generativeai as genai
from app.core.config import settings
from app.services.search_service import SearchService
from app.services.cache_service import CacheService
import logging
import re
import asyncio

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        self.search_service = SearchService()
        self.cache_service = CacheService()
        
        # Initialize Gemini for fallback
        if settings.GOOGLE_API_KEY:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            self.gemini_model = genai.GenerativeModel('gemini-2.0-flash-exp')
        else:
            self.gemini_model = None

        # Simplified system prompt (no search instructions needed)
        self.system_prompt = (
            "You are a helpful and concise voice assistant. Give short, conversational answers suitable for real-time speech. "
            "Keep responses under 2-3 sentences for better voice delivery."
        )
        
        # Keywords that indicate need for web search
        self.search_keywords = [
            # Weather
            'weather', 'temperature', 'forecast', 'rain', 'snow', 'sunny', 'cloudy',
            # Time-sensitive
            'today', 'yesterday', 'tonight', 'tomorrow', 'this week', 'latest', 'recent', 'current', 'now',
            # News & Events
            'news', 'happened', 'breaking', 'update', 'announcement',
            # Sports
            'score', 'game', 'match', 'won', 'lost', 'championship', 'tournament',
            # Finance
            'price', 'stock', 'market', 'trading', 'crypto', 'bitcoin', 'ethereum',
            # General current info
            'who is', 'what is happening', 'tell me about recent'
        ]

    def _needs_web_search(self, query: str) -> bool:
        """
        Fast keyword-based classification to determine if query needs web search.
        Returns True if query requires current/real-time information.
        """
        query_lower = query.lower()
        
        # Check for search keywords
        for keyword in self.search_keywords:
            if keyword in query_lower:
                logger.info(f"Search needed - matched keyword: '{keyword}' in query: '{query}'")
                return True
        
        # Check for question patterns that typically need current info
        current_info_patterns = [
            r'what.*happening',
            r'who.*won',
            r'what.*score',
            r'how.*weather',
            r'what.*price',
        ]
        
        for pattern in current_info_patterns:
            if re.search(pattern, query_lower):
                logger.info(f"Search needed - matched pattern: '{pattern}' in query: '{query}'")
                return True
        
        logger.info(f"No search needed for query: '{query}'")
        return False

    def set_system_prompt(self, prompt: str):
        self.system_prompt = prompt
        logger.info(f"System prompt updated: {prompt[:50]}...")

    async def get_response(self, user_input: str, history: list = []):
        if not user_input or not isinstance(user_input, str):
            logger.warning("Empty or invalid user input received")
            yield "I didn't catch that. Could you please repeat?"
            return
            
        if not isinstance(history, list):
            history = []
        
        # Check cache first (only for queries without history)
        if not history:
            cached = await self.cache_service.get_cached_response(user_input, self.system_prompt)
            if cached:
                logger.info(f"Cache hit for query: {user_input}")
                yield cached
                return

        # PRE-CLASSIFICATION: Check if query needs web search
        needs_search = self._needs_web_search(user_input)
        
        if needs_search:
            # Fast path: Search immediately without asking LLM first
            yield f"[STATUS: Searching...]"
            try:
                raw_results = await self.search_service.search(user_input)
                search_results = raw_results[:2000]
                logger.info(f"Search completed, results length: {len(raw_results)} chars")
                
                # Build messages with search results
                messages = [{"role": "system", "content": self.system_prompt}]
                messages.extend(history)
                messages.append({"role": "system", "content": f"Search Results for '{user_input}':\n{search_results}\n\nAnswer the user's question using these search results."})
                messages.append({"role": "user", "content": user_input})
                
                # Generate response with search results
                full_response = ""
                async for chunk in self._stream_groq_response(messages):
                    full_response += chunk
                    yield chunk
                
                # Cache the response
                if not history and full_response:
                    await self.cache_service.set_cached_response(user_input, full_response, self.system_prompt)
                    
            except Exception as e:
                logger.error(f"Search flow failed: {e}")
                # Fallback to regular LLM response
                messages = [{"role": "system", "content": self.system_prompt}]
                messages.extend(history)
                messages.append({"role": "user", "content": user_input})
                async for chunk in self._stream_groq_response(messages):
                    yield chunk
        else:
            # Regular path: Direct LLM response (no search needed)
            messages = [{"role": "system", "content": self.system_prompt}]
            messages.extend(history)
            messages.append({"role": "user", "content": user_input})
            
            try:
                full_response = ""
                async for chunk in self._stream_groq_response(messages):
                    full_response += chunk
                    yield chunk
                
                # Cache the response
                if not history and full_response:
                    await self.cache_service.set_cached_response(user_input, full_response, self.system_prompt)
                    
            except Exception as e:
                logger.error(f"Groq primary flow failed, attempting fallback: {e}")
                if self.gemini_model:
                    async for chunk in self._get_gemini_fallback(user_input, history):
                        yield chunk
                else:
                    yield "I'm sorry, I'm having trouble processing that right now."

    async def _stream_groq_response(self, messages):
        """
        Simple streaming from Groq without search detection.
        Just streams tokens as they arrive.
        """
        completion = await self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            stream=True,
            max_tokens=250,  # Reduced from 300 for faster responses
        )
        
        async for chunk in completion:
            if content := chunk.choices[0].delta.content:
                yield content

    async def _get_gemini_fallback(self, user_input, history):
        try:
            # Simple fallback for now
            response = self.gemini_model.generate_content(user_input, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            logger.error(f"Gemini fallback failed: {e}")
            yield "I'm experiencing systemic issues. Please try again later."

