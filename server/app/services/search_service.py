from tavily import TavilyClient
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class SearchService:
    def __init__(self):
        self.client = TavilyClient(api_key=settings.TAVILY_API_KEY)

    async def search(self, query: str) -> str:
        try:
            # Using search instead of qna for more context if needed, 
            # but qna is simpler for tool use. Let's go with search for now.
            response = self.client.search(query=query, search_depth="advanced", max_results=3)
            
            context = ""
            for result in response.get("results", []):
                context += f"Source: {result.get('url')}\nContent: {result.get('content')}\n\n"
            
            return context if context else "No relevant search results found."
        except Exception as e:
            logger.error(f"Tavily Search Error: {e}")
            return f"Error performing search: {e}"
