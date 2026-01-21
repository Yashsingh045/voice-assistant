from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.stt_service import STTService
from app.services.tts_service import TTSService
from app.services.llm_service import LLMService
from app.services.history_service import HistoryService
import asyncio
import uuid
import logging
import json
import re

router = APIRouter()
logger = logging.getLogger(__name__)

from app.utils.audio_utils import process_audio_chunk

@router.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket, session_id: str = None):
    await websocket.accept()
    
    if not session_id:
        session_id = str(uuid.uuid4())
    
    stt_service = None
    llm_service = LLMService()
    tts_service = TTSService()
    history_service = HistoryService()
    
    interrupt_event = asyncio.Event()
    
    async def stt_callback(transcript: str, is_final: bool):
        if is_final:
            logger.info(f"Final Transcript: {transcript} for session: {session_id}")
            # Save user message to history
            history_service.add_message(session_id, "user", transcript)
            
            # Fetch full history for LLM context
            history = history_service.get_history(session_id)
            
            # Signal interruption to any ongoing response
            interrupt_event.set()
            await asyncio.sleep(0.1) # Small delay to let current loops settle
            interrupt_event.clear()
            
            await websocket.send_json({"type": "transcript", "text": transcript, "is_user": True})
            
            sentence_buffer = ""
            full_ai_response = ""
            try:
                # pass history to llm_service
                async for chunk in llm_service.get_response(transcript, history=history[:-1]): # Exclude the message we just added as it's passed as user_input
                    if interrupt_event.is_set():
                        logger.info("Interrupted during LLM generation")
                        break

                    # Check for status messages
                    if chunk.startswith("[STATUS: ") and chunk.endswith("]"):
                        status_text = chunk[9:-1]
                        await websocket.send_json({"type": "status", "text": status_text})
                        continue

                    await websocket.send_json({"type": "transcript_chunk", "text": chunk, "is_user": False})
                    sentence_buffer += chunk
                    full_ai_response += chunk
                    
                    # If we have a complete sentence, stream it to TTS
                    if any(punct in chunk for punct in [".", "!", "?", "\n"]):
                        sentences = re.split(r'(?<=[.!?])\s+', sentence_buffer)
                        if len(sentences) > 1:
                            # The last part might be an incomplete sentence
                            for s in sentences[:-1]:
                                if s.strip():
                                    async for audio_chunk in tts_service.stream_audio(s.strip()):
                                        if interrupt_event.is_set():
                                            logger.info("Interrupted during TTS streaming")
                                            break
                                        await websocket.send_bytes(audio_chunk)
                            if interrupt_event.is_set(): break
                            sentence_buffer = sentences[-1]
                        elif "\n" in chunk:
                             # Handle newlines as sentence breaks
                             if sentence_buffer.strip():
                                async for audio_chunk in tts_service.stream_audio(sentence_buffer.strip()):
                                    if interrupt_event.is_set():
                                        logger.info("Interrupted during TTS streaming")
                                        break
                                    await websocket.send_bytes(audio_chunk)
                                sentence_buffer = ""

                # Stream any remaining text
                if not interrupt_event.is_set() and sentence_buffer.strip():
                    async for audio_chunk in tts_service.stream_audio(sentence_buffer.strip()):
                        if interrupt_event.is_set():
                            logger.info("Interrupted during TTS streaming")
                            break
                        await websocket.send_bytes(audio_chunk)
                elif interrupt_event.is_set():
                    logger.info("Response abandoned due to interruption")
                
                # Save AI response to history
                if full_ai_response:
                    history_service.add_message(session_id, "assistant", full_ai_response)
                    
                interrupt_event.clear()
                
            except Exception as e:
                logger.error(f"Error in stt_callback: {e}")
                interrupt_event.clear()
                
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
                elif msg.get("type") == "barge-in":
                    logger.info("Barge-in requested by client")
                    interrupt_event.set()
                    await asyncio.sleep(0.05)
                    interrupt_event.clear()
                elif msg.get("type") == "update_context":
                    new_prompt = msg.get("text")
                    if new_prompt:
                        llm_service.set_system_prompt(new_prompt)
                        await websocket.send_json({"type": "status", "text": "Instructions updated."})
                    
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket Error: {e}")
    finally:
        if stt_service:
            await stt_service.stop()
