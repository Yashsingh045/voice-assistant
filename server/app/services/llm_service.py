from groq import AsyncGroq
from app.core.config import settings
from app.services.search_service import SearchService
import logging
import re

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        self.search_service = SearchService()
        self.system_prompt = (
            "You are a helpful and concise voice assistant. Give short, conversational answers suitable for real-time speech. "
            "If you need current information from the web to answer a question, start your response with '[SEARCH: query]' "
            "where 'query' is what you want to search for. For example: '[SEARCH: current weather in London]'. "
            "Only use search if necessary."
        )

    async def get_response(self, user_input: str, history: list = []):
        messages = [{"role": "system", "content": self.system_prompt}]
        messages.extend(history)
        messages.append({"role": "user", "content": user_input})

        try:
            # First attempt to see if search is needed
            completion = await self.client.chat.completions.create(
                model="llama3-70b-8192",
                messages=messages,
                stream=False, # Use non-streaming for the potential search trigger check
                max_tokens=100,
            )
            
            response_text = completion.choices[0].message.content
            
            # Check for search trigger
            search_match = re.search(r'\[SEARCH:\s*(.*?)\]', response_text)
            if search_match:
                query = search_match.group(1)
                yield f"[STATUS: Searching for '{query}'...]"
                
                search_results = await self.search_service.search(query)
                
                # Add search results as context and get final streaming response
                messages.append({"role": "assistant", "content": f"Searching for '{query}'..."})
                messages.append({"role": "system", "content": f"Search Results: {search_results}"})
                
                completion = await self.client.chat.completions.create(
                    model="llama3-70b-8192",
                    messages=messages,
                    stream=True,
                    max_tokens=300,
                )
            else:
                # If no search, we already have a response text, but we might want to stream it for consistency
                # or just yield it directly. Since the user expects streaming, we'll re-run with streaming or yield this.
                # Actually, if we didn't search, we can just yield the text we got.
                # But to keep latency low for non-search cases, this "dual call" is bad.
                
                # Optimization: Run streaming immediately and detect search in the first few chunks.
                # However, for now, let's keep it robust. 
                # Better: Always stream, and if the first chunk starts with '[SEARCH:', we switch modes.
                yield response_text
                return

            if search_match:
                async for chunk in completion:
                    if content := chunk.choices[0].delta.content:
                        yield content
                    
        except Exception as e:
            logger.error(f"Groq Error: {e}")
            yield "I'm sorry, I'm having trouble processing that."

