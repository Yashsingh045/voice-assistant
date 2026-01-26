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
            self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            self.gemini_model = None

        self.system_prompt = (
            "You are a helpful and concise voice assistant. Give short, conversational answers suitable for real-time speech. "
            "If you need current information from the web to answer a question, start your response with '[SEARCH: query]' "
            "where 'query' is what you want to search for. For example: '[SEARCH: current weather in London]'. "
            "Only use search if necessary."
        )

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
        if not history:
            cached = await self.cache_service.get_cached_response(user_input, self.system_prompt)
            if cached:
                logger.info(f"Cache hit for query: {user_input}")
                yield cached
                return

        messages = [{"role": "system", "content": self.system_prompt}]
        messages.extend(history)
        messages.append({"role": "user", "content": user_input})

        try:
            full_response = ""
            is_search = False
            async for chunk in self._get_groq_response(messages, user_input, history):
                if chunk.startswith("[STATUS:"):
                    is_search = True
                else:
                    full_response += chunk
                yield chunk
            
            # Cache the response if it was a direct hit (no history, no search)
            if not history and not is_search and full_response:
                await self.cache_service.set_cached_response(user_input, full_response, self.system_prompt)
                
        except Exception as e:
            logger.error(f"Groq primary flow failed, attempting fallback: {e}")
            if self.gemini_model:
                async for chunk in self._get_gemini_fallback(user_input, history):
                    yield chunk
            else:
                yield "I'm sorry, I'm having trouble processing that right now."

    async def _get_groq_response(self, messages, user_input, history):
        # Always use streaming for better latency
        completion = await self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            stream=True,
            max_tokens=300,
        )

        full_response = ""
        is_search_detected = False
        first_chunk_checked = False
        
        async for chunk in completion:
            if content := chunk.choices[0].delta.content:
                full_response += content
                
                # Check for search trigger in the very first chunks
                if not first_chunk_checked and len(full_response) >= 8:
                    if "[SEARCH:" in full_response:
                        is_search_detected = True
                        break
                    first_chunk_checked = True
                
                if not is_search_detected:
                    yield content

        if is_search_detected:
            # Re-process with search logic if [SEARCH:] was found
            search_match = re.search(r'\[SEARCH:\s*(.*?)\]', full_response)
            if search_match:
                query = search_match.group(1)
                yield f"[STATUS: Searching for '{query}'...]"
                raw_results = await self.search_service.search(query)
                search_results = raw_results[:2000] # Truncate to prevent context bloat
                
                messages.append({"role": "assistant", "content": f"Searching for '{query}'..."})
                messages.append({"role": "system", "content": f"Search Results: {search_results}"})
                
                final_completion = await self.client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=messages,
                    stream=True,
                    max_tokens=300,
                )
                async for chunk in final_completion:
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

