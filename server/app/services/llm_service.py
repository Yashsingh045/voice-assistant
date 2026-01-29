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
        self.response_mode = "planning"  # Default mode: faster, planning, or detailed
        
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
        
        # Convert keywords to set for O(1) lookup (optimization)
        self.search_keywords = {
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
        }
        
        # Mode-specific configurations
        self.mode_config = {
            "faster": {
                "max_tokens": 150,  # Shorter responses
                "search_results": 0,  # No search
                "model": "llama-3.1-8b-instant",  # Faster 8B model
            },
            "planning": {
                "max_tokens": 250,  # Balanced
                "search_results": 2,  # Reduced from 3
                "model": "llama-3.3-70b-versatile",  # Standard 70B model
            },
            "detailed": {
                "max_tokens": 250,  # Same as planning for now
                "search_results": 2,
                "model": "llama-3.3-70b-versatile",  # Standard 70B model
            }
        }

    def _needs_web_search(self, query: str) -> bool:
        """
        Fast keyword-based classification to determine if query needs web search.
        Returns True if query requires current/real-time information.
        Optimized with O(1) set lookup instead of O(n) list iteration.
        """
        query_lower = query.lower()
        query_words = set(query_lower.split())
        
        # O(1) set intersection check
        if self.search_keywords & query_words:
            matched = self.search_keywords & query_words
            logger.info(f"Search needed - matched keywords: {matched} in query: '{query}'")
            return True
        
        # Check for multi-word phrases
        for keyword in ['who is', 'what is happening', 'tell me about recent']:
            if keyword in query_lower:
                logger.info(f"Search needed - matched phrase: '{keyword}' in query: '{query}'")
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
    
    def set_response_mode(self, mode: str):
        """Set the response mode for query processing."""
        if mode in ["faster", "planning", "detailed"]:
            self.response_mode = mode
            logger.info(f"Response mode set to: {mode}")
        else:
            logger.warning(f"Invalid response mode: {mode}")

    async def get_response(self, user_input: str, history: list = [], metrics_tracker=None):
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

        # Mode-based decision: determine if we need web search
        if self.response_mode == "faster":
            # Faster mode: Skip search entirely, go direct to LLM
            needs_search = False
        elif self.response_mode in ["planning", "detailed"]:
            # Planning/Detailed mode: Use pre-classification logic
            needs_search = self._needs_web_search(user_input)
        else:
            # Default to planning behavior
            needs_search = self._needs_web_search(user_input)
        
        if needs_search:
            # Get mode config
            config = self.mode_config.get(self.response_mode, self.mode_config["planning"])
            max_results = config["search_results"]
            
            # PLANNING MODE: Parallel Search + LLM for faster response
            if self.response_mode == "planning":
                yield f"[STATUS: Searching...]"
                try:
                    # Track search timing
                    if metrics_tracker:
                        metrics_tracker.start_timing("search_latency")
                    
                    # Start search and LLM in parallel
                    search_task = asyncio.create_task(self.search_service.search(user_input, max_results=max_results))
                    
                    # Build messages for LLM (without search results first)
                    messages = [{"role": "system", "content": self.system_prompt}]
                    messages.extend(history)
                    messages.append({"role": "user", "content": user_input})
                    
                    # Start LLM streaming immediately
                    llm_started = False
                    full_response = ""
                    
                    # Wait for search with timeout
                    try:
                        search_results = await asyncio.wait_for(search_task, timeout=0.8)  # 800ms timeout
                        if metrics_tracker:
                            metrics_tracker.stop_timing("search_latency")
                        
                        # If search completes quickly, use it
                        if search_results and not llm_started:
                            messages.append({"role": "system", "content": f"Search Results:\n{search_results[:2000]}"})
                            logger.info(f"Search completed in time, using results")
                    except asyncio.TimeoutError:
                        # Search taking too long, proceed without it
                        logger.info(f"Search timeout, proceeding with LLM only")
                        if metrics_tracker:
                            metrics_tracker.stop_timing("search_latency")
                    
                    # Stream LLM response
                    async for chunk in self._stream_groq_response(messages, max_tokens=config["max_tokens"], metrics_tracker=metrics_tracker):
                        full_response += chunk
                        yield chunk
                    
                    # Cache the response
                    if not history and full_response:
                        await self.cache_service.set_cached_response(user_input, full_response, self.system_prompt)
                        
                except Exception as e:
                    logger.error(f"Parallel search flow failed: {e}")
                    # Fallback to direct LLM
                    messages = [{"role": "system", "content": self.system_prompt}]
                    messages.extend(history)
                    messages.append({"role": "user", "content": user_input})
                    async for chunk in self._stream_groq_response(messages, max_tokens=config["max_tokens"], metrics_tracker=metrics_tracker):
                        yield chunk
            else:
                # DETAILED MODE: Sequential search (wait for complete results)
                yield f"[STATUS: Searching...]"
                try:
                    # Track search timing
                    if metrics_tracker:
                        metrics_tracker.start_timing("search_latency")
                    
                    raw_results = await self.search_service.search(user_input, max_results=max_results)
                    search_results = raw_results[:2000]
                    
                    if metrics_tracker:
                        metrics_tracker.stop_timing("search_latency")
                    
                    logger.info(f"Search completed, results length: {len(raw_results)} chars")
                    
                    # Build messages with search results
                    messages = [{"role": "system", "content": self.system_prompt}]
                    messages.extend(history)
                    messages.append({"role": "system", "content": f"Search Results for '{user_input}':\n{search_results}\n\nAnswer the user's question using these search results."})
                    messages.append({"role": "user", "content": user_input})
                    
                    # Generate response with search results
                    full_response = ""
                    async for chunk in self._stream_groq_response(messages, max_tokens=config["max_tokens"], metrics_tracker=metrics_tracker):
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
                    async for chunk in self._stream_groq_response(messages, max_tokens=config["max_tokens"], metrics_tracker=metrics_tracker):
                        yield chunk
        else:
            # Regular path: Direct LLM response (no search needed)
            config = self.mode_config.get(self.response_mode, self.mode_config["planning"])
            messages = [{"role": "system", "content": self.system_prompt}]
            messages.extend(history)
            messages.append({"role": "user", "content": user_input})
            
            try:
                full_response = ""
                async for chunk in self._stream_groq_response(messages, max_tokens=config["max_tokens"], metrics_tracker=metrics_tracker):
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

    async def _stream_groq_response(self, messages, max_tokens=None, metrics_tracker=None):
        """
        Simple streaming from Groq without search detection.
        Just streams tokens as they arrive.
        Uses mode-specific model for optimal performance.
        """
        config = self.mode_config.get(self.response_mode, self.mode_config["planning"])
        
        if max_tokens is None:
            max_tokens = config["max_tokens"]
        
        model = config["model"]
        
        # Update metrics with actual model being used
        if metrics_tracker:
            metrics_tracker.set_model(model)
        
        completion = await self.client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
            max_tokens=max_tokens,
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

