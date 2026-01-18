from groq import AsyncGroq
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        self.system_prompt = "You are a helpful and concise voice assistant. Give short, conversational answers suitable for real-time speech."

    async def get_response(self, user_input: str, history: list = []):
        messages = [{"role": "system", "content": self.system_prompt}]
        messages.extend(history)
        messages.append({"role": "user", "content": user_input})

        try:
            completion = await self.client.chat.completions.create(
                model="llama3-70b-8192",
                messages=messages,
                stream=True,
                max_tokens=300,
            )
            
            full_response = ""
            async for chunk in completion:
                if content := chunk.choices[0].delta.content:
                    full_response += content
                    yield content
                    
        except Exception as e:
            logger.error(f"Groq Error: {e}")
            yield "I'm sorry, I'm having trouble processing that."
