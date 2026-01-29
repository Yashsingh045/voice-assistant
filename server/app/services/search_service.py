from tavily import TavilyClient
from app.core.config import settings
import logging
import asyncio

logger = logging.getLogger(__name__)

class SearchService:
    def __init__(self):
        self.client = TavilyClient(api_key=settings.TAVILY_API_KEY)

    async def search(self, query: str, max_results: int = 3) -> str:
        try:
            # Run synchronous Tavily client in executor to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.search(
                    query=query, 
                    search_depth="basic",  # Changed from "advanced" for faster results
                    max_results=max_results
                )
            )
            
            context = ""
            for result in response.get("results", []):
                context += f"Source: {result.get('url')}\nContent: {result.get('content')}\n\n"
            
            if not context:
                logger.warning(f"No search results found for query: {query}")
                return "No relevant search results found."
            
            logger.info(f"Search successful for query: {query}, found {len(response.get('results', []))} results")
            return context
        except Exception as e:
            logger.error(f"Tavily Search Error: {e}", exc_info=True)
            return f"Error performing search: {str(e)}"
