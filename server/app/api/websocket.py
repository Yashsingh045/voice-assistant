from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.stt_service import STTService
from app.services.tts_service import TTSService
from app.services.llm_service import LLMService
from app.services.history_service import HistoryService
from app.services.vad_service import VADService
from app.utils.metrics import MetricsTracker
from app.utils.validation import sanitize_transcript, validate_session_id, sanitize_system_prompt
import asyncio
import uuid
import logging
import json
import re

router = APIRouter()
logger = logging.getLogger(__name__)

# Simple Rate Limiting / Connection Tracking
active_connections = {}

from app.utils.audio_utils import process_audio_chunk


async def _tts_sentence_to_pcm(tts_service: TTSService, sentence: str, interrupt_event: asyncio.Event, gen_id: int, current_generation_id: int):
    pcm_parts = []
    async for audio_chunk in tts_service.stream_audio(sentence):
        if interrupt_event.is_set() or gen_id != current_generation_id:
            return b""
        if audio_chunk:
            pcm_parts.append(audio_chunk)
    return b"".join(pcm_parts)

@router.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket, session_id: str = None):
    client_host = websocket.client.host
    active_connections[client_host] = active_connections.get(client_host, 0) + 1
    
    if active_connections[client_host] > 5:
        await websocket.accept()
        await websocket.send_json({"type": "error", "text": "Too many active sessions from your IP. Please close some tabs."})
        await websocket.close()
        active_connections[client_host] -= 1
        return

    await websocket.accept()
    
    # Validate session ID
    if not validate_session_id(session_id):
        await websocket.send_json({"type": "error", "text": "Invalid session ID"})
        await websocket.close()
        return
    
    if not session_id:
        session_id = str(uuid.uuid4())
    
    stt_service = None
    llm_service = LLMService()
    tts_service = TTSService()
    history_service = HistoryService()
    vad_service = VADService(mode=1, sample_rate=16000)  # Mode 1 for balanced sensitivity
    metrics = MetricsTracker()
    metrics.set_model("Llama 3.3 70B") # Explicitly set model name
    
    # helper to send status logs
    async def send_system_log(msg: str):
        await websocket.send_json({"type": "system_log", "text": msg})

    await send_system_log("Connection secure")
    await send_system_log("Buffer synchronized")
    await send_system_log("Neural weights loaded")
    
    interrupt_event = asyncio.Event()
    current_generation_id = 0
    
    async def stt_callback(transcript: str, is_final: bool):
        nonlocal current_generation_id
        try:
            if not is_final:
                await websocket.send_json({"type": "transcript_interim", "text": transcript})
                return

            # Stop STT timing when we get final transcript
            metrics.stop_timing("stt_latency")
            logger.info(f"Final Transcript: {transcript} for session: {session_id}")
            
            # Sanitize transcript
            clean_transcript = sanitize_transcript(transcript)
            if not clean_transcript:
                logger.warning(f"Empty or invalid transcript after sanitization")
                return
                
            transcript = clean_transcript
            metrics.start_timing("total_turnaround")
            metrics.start_timing("llm_generation")
            metrics.start_timing("tts_latency")
            
            # Save user message to history
            await history_service.add_message(session_id, "user", transcript)
            
            # Fetch full history for LLM context
            history = await history_service.get_history(session_id)
            
            # Signal interruption to any ongoing response
            interrupt_event.set()
            await asyncio.sleep(0.1) # Small delay to let current loops settle
            interrupt_event.clear()
            
            await websocket.send_json({"type": "transcript", "text": transcript, "is_user": True})
            
            # Increment generation ID for this turn
            current_generation_id += 1
            gen_id = current_generation_id
            
            sentence_buffer = ""
            full_ai_response = ""
            
            async for chunk in llm_service.get_response(transcript, history=history[:-1]):
                # If a new turn started or barge-in happened, abort this one
                if interrupt_event.is_set() or gen_id != current_generation_id:
                    logger.info(f"Generation {gen_id} aborted")
                    return

                if chunk.startswith("[STATUS: ") and chunk.endswith("]"):
                    await websocket.send_json({"type": "status", "text": chunk[9:-1]})
                    continue

                await websocket.send_json({"type": "transcript_chunk", "text": chunk})
                sentence_buffer += chunk
                full_ai_response += chunk
                
                # Track tokens for TPS
                metrics.add_tokens(1) 
                
                if any(punct in chunk for punct in [".", "!", "?", "\n"]):
                    sentences = re.split(r'(?<=[.!?])\s+', sentence_buffer)
                    if len(sentences) > 1:
                        for s in sentences[:-1]:
                            if s.strip():
                                pcm = await _tts_sentence_to_pcm(tts_service, s.strip(), interrupt_event, gen_id, current_generation_id)
                                # Stop TTS timing on first audio chunk
                                if metrics.metrics.get("tts_latency", {}).get("start"):
                                    metrics.stop_timing("tts_latency")
                                if interrupt_event.is_set() or gen_id != current_generation_id:
                                    break
                                if pcm:
                                    await websocket.send_bytes(pcm)
                        if interrupt_event.is_set() or gen_id != current_generation_id:
                            break
                        sentence_buffer = sentences[-1]
                    elif "\n" in chunk and sentence_buffer.strip():
                         pcm = await _tts_sentence_to_pcm(tts_service, sentence_buffer.strip(), interrupt_event, gen_id, current_generation_id)
                         if not (interrupt_event.is_set() or gen_id != current_generation_id):
                            if pcm:
                                await websocket.send_bytes(pcm)
                         sentence_buffer = ""

            # Stream any remaining text
            if not interrupt_event.is_set() and gen_id == current_generation_id and sentence_buffer.strip():
                pcm = await _tts_sentence_to_pcm(tts_service, sentence_buffer.strip(), interrupt_event, gen_id, current_generation_id)
                if not (interrupt_event.is_set() or gen_id != current_generation_id):
                    if pcm:
                        await websocket.send_bytes(pcm)
            
            # Save AI response to history
            if full_ai_response and not interrupt_event.is_set() and gen_id == current_generation_id:
                await history_service.add_message(session_id, "assistant", full_ai_response)
                metrics.stop_timing("llm_generation")
                metrics.stop_timing("total_turnaround")
                await websocket.send_json({"type": "metrics", "data": metrics.get_all()})
                    
        except WebSocketDisconnect:
            raise
        except Exception as e:
            logger.error(f"Error in STT callback turn: {e}", exc_info=True)
            try:
                await websocket.send_json({"type": "error", "text": "I encountered an issue processing that."})
            except: pass
        finally:
            # We don't clear interrupt_event here as it might clear it for a *new* valid turn
            pass
                
    stt_service = STTService(stt_callback)
    await send_system_log("Engine ready")
    await stt_service.start()
    
    try:
        while True:
            data = await websocket.receive()
            if data.get("type") == "websocket.disconnect":
                raise WebSocketDisconnect
            if "bytes" in data:
                # Pipeline: Noise Suppression → VAD → STT
                raw_audio = data["bytes"]

                # Step 1: VAD - Check if audio contains speech (run on raw audio)
                is_speech = vad_service.is_speech(raw_audio)
                
                if is_speech:
                    # Start STT timing when speech begins
                    if not metrics.metrics.get("stt_latency", {}).get("start"):
                        metrics.start_timing("stt_latency")

                # Always send audio to Deepgram to prevent timeout closures.
                # We still use VAD for metrics and for deciding when a "turn" starts.
                processed_audio = process_audio_chunk(raw_audio)
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
                elif msg.get("type") == "speech_end":
                    logger.info("Speech end detected by client VAD")
                    # Optionally we could force-close the current STT stream or send a finalizer
                    # but with endpointing=500, Deepgram should already be finalizing.
                elif msg.get("type") == "update_context":
                    new_prompt = msg.get("text")
                    if new_prompt:
                        # Sanitize system prompt
                        clean_prompt = sanitize_system_prompt(new_prompt)
                        llm_service.set_system_prompt(clean_prompt)
                        await websocket.send_json({"type": "status", "text": "Instructions updated."})
                    
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket Error: {e}")
    finally:
        active_connections[client_host] = max(0, active_connections.get(client_host, 1) - 1)
        if stt_service:
            await stt_service.stop()
