from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.stt_service import STTService
from app.services.tts_service import TTSService
from app.services.llm_service import LLMService
import asyncio
import logging
import json

router = APIRouter()
logger = logging.getLogger(__name__)

from app.utils.audio_utils import process_audio_chunk

@router.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    stt_service = None
    llm_service = LLMService()
    tts_service = TTSService()
    
    async def stt_callback(transcript: str, is_final: bool):
        if is_final:
            logger.info(f"Final Transcript: {transcript}")
            await websocket.send_json({"type": "transcript", "text": transcript, "is_user": True})
            
            full_ai_text = ""
            async for chunk in llm_service.get_response(transcript):
                full_ai_text += chunk
                await websocket.send_json({"type": "transcript_chunk", "text": chunk, "is_user": False})
            
            async for audio_chunk in tts_service.stream_audio(full_ai_text):
                await websocket.send_bytes(audio_chunk)
                
    stt_service = STTService(stt_callback)
    await stt_service.start()
    
    try:
        while True:
            data = await websocket.receive()
            if "bytes" in data:
                # Apply custom noise suppression/filtering
                processed_audio = process_audio_chunk(data["bytes"])
                await stt_service.send_audio(processed_audio)
            elif "text" in data:
                # Handle control messages
                msg = json.loads(data["text"])
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                    
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket Error: {e}")
    finally:
        if stt_service:
            await stt_service.stop()
