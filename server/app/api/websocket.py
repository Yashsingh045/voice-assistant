from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.stt_service import STTService
from app.services.tts_service import TTSService
from app.services.llm_service import LLMService
from app.services.history_service import HistoryService
from app.services.transcript_service import TranscriptService
from app.services.vad_service import VADService
from app.services.session_service import SessionService
from app.utils.metrics import MetricsTracker
from app.utils.validation import sanitize_transcript, validate_session_id, sanitize_system_prompt
from app.utils.sentence_detection import SmartSentenceBuffer
import asyncio
import uuid
import logging
import json
import re

router = APIRouter()
logger = logging.getLogger(__name__)

# Simple Rate Limiting / Connection Tracking
active_connections: dict[str, WebSocket] = {}

from app.utils.audio_utils import process_audio_chunk


async def _tts_sentence_to_pcm(tts_service: TTSService, sentence: str, interrupt_event: asyncio.Event, gen_id: int, current_generation_id: int):
    """
    Convert a sentence to PCM audio using TTS service.
    Removed AI STT dependency - transcripts now use original LLM text.
    """
    import hashlib
    sentence_hash = hashlib.md5(sentence.encode()).hexdigest()[:8]
    logger.info(f"TTS generating audio for sentence (hash: {sentence_hash}, gen_id: {gen_id}): {sentence[:50]}...")
    
    pcm_parts = []
    try:
        async for audio_chunk in tts_service.stream_audio(sentence):
            if interrupt_event.is_set() or gen_id != current_generation_id:
                logger.info(f"TTS interrupted for sentence hash: {sentence_hash}")
                return b""
            if audio_chunk:
                pcm_parts.append(audio_chunk)
        result = b"".join(pcm_parts)
        logger.info(f"TTS completed for sentence hash: {sentence_hash}, audio size: {len(result)} bytes")
        return result
    except Exception as e:
        logger.error(f"TTS streaming error for sentence hash {sentence_hash}: {e}")
        return b""

@router.websocket("/ws/chat")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str = Query(None),
    device_id: str = Query(None),
):
    if not device_id:
        await websocket.accept()
        await websocket.send_json({
            "type": "error",
            "text": "device_id is required"
        })
        await websocket.close(code=1008)
        return

    await websocket.accept()

    # Replace existing connection for same device
    old_ws = active_connections.get(device_id)
    if old_ws:
        try:
            await old_ws.close(code=4000)
        except:
            pass

    active_connections[device_id] = websocket
    
    # Initialize session service first
    session_service = SessionService()
    await session_service.connect()
    
    # Validate and ensure session exists
    if not session_id:
        session_id = str(uuid.uuid4())
        # Create new session with device_id
        new_session = await session_service.create_session(device_id=device_id)
        session_id = new_session.id
    else:
        # Validate session_id format
        if not validate_session_id(session_id):
            await websocket.send_json({"type": "error", "text": "Invalid session ID"})
            await websocket.close()
            await session_service.disconnect()
            return
        
        # Check if session exists and belongs to device
        try:
            existing_session = await session_service.prisma.session.find_unique(
                where={'id': session_id}
            )
            
            # If session doesn't exist OR belongs to another device, create new one
            if not existing_session or existing_session.deviceId != device_id:
                if existing_session:
                    logger.warning(f"Session {session_id} device mismatch. Client: {device_id}, Session: {existing_session.deviceId}")
                
                # Create new session for this device
                new_session = await session_service.create_session(device_id=device_id)
                session_id = new_session.id
                
                # Notify client about new session ID so it can update local state
                await websocket.send_json({
                    "type": "session_reset", 
                    "sessionId": session_id,
                    "text": "Session reset due to device mismatch"
                })
        except Exception as e:
            logger.error(f"Error checking session: {e}", exc_info=True)
            await websocket.send_json({"type": "error", "text": "Session validation error"})
            await websocket.close()
            await session_service.disconnect()
            return
    
    stt_service = None
    llm_service = LLMService()
    tts_service = TTSService()
    history_service = HistoryService()
    transcript_service = TranscriptService(history_service)
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
            
            # Save user message to history using transcript service
            await transcript_service.store_user_message(session_id, transcript)
            
            # Save user message to session database
            await session_service.add_message(session_id, transcript, is_user=True)
            
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
            
            # Initialize smart sentence buffer for this response
            sentence_buffer = SmartSentenceBuffer()
            full_ai_response = ""
            processed_sentences = set()  # Track processed sentences to avoid duplicates
            
            # Send empty assistant transcript immediately to show the bubble
            await websocket.send_json({"type": "assistant_transcript_start", "is_user": False})
            
            async for chunk in llm_service.get_response(transcript, history=history[:-1], metrics_tracker=metrics):
                # If a new turn started or barge-in happened, abort this one
                if interrupt_event.is_set() or gen_id != current_generation_id:
                    logger.info(f"Generation {gen_id} aborted")
                    return

                if chunk.startswith("[STATUS: ") and chunk.endswith("]"):
                    await websocket.send_json({"type": "status", "text": chunk[9:-1]})
                    continue

                await websocket.send_json({"type": "transcript_chunk", "text": chunk})
                full_ai_response += chunk
                
                # Track tokens for TPS
                metrics.add_tokens(1)
                
                # Add chunk to smart sentence buffer
                complete_sentences = sentence_buffer.add_chunk(chunk)
                
                # Process any complete sentences
                for sentence in complete_sentences:
                    if interrupt_event.is_set() or gen_id != current_generation_id:
                        break
                    
                    if sentence.strip():
                        # Skip if we've already processed this sentence
                        sentence_key = sentence.strip()
                        if sentence_key in processed_sentences:
                            logger.debug(f"Skipping duplicate sentence: {sentence_key[:50]}...")
                            continue
                        processed_sentences.add(sentence_key)
                        logger.debug(f"Processing sentence: {sentence_key[:50]}...")
                        
                        # Clean sentence for TTS - preserve decimal numbers but remove sentence punctuation
                        clean_sentence = sentence.strip()
                        
                        # Replace multiple periods (ellipsis) with comma
                        clean_sentence = clean_sentence.replace('...', ',')
                        
                        # Remove sentence-ending periods but preserve decimal points
                        # Replace period at end of sentence or followed by space (but not in numbers)
                        clean_sentence = re.sub(r'\.(?!\d)', '', clean_sentence)
                        
                        # Remove other trailing punctuation
                        while clean_sentence and clean_sentence[-1] in '!?,;:':
                            clean_sentence = clean_sentence[:-1]
                        
                        if clean_sentence:  # Only process if there's text left
                            # Generate TTS audio with cleaned sentence
                            pcm = await _tts_sentence_to_pcm(tts_service, clean_sentence, interrupt_event, gen_id, current_generation_id)
                            
                            # Stop TTS timing on first audio chunk
                            if metrics.metrics.get("tts_latency", {}).get("start"):
                                metrics.stop_timing("tts_latency")
                        
                        if interrupt_event.is_set() or gen_id != current_generation_id:
                            break
                        
                        if pcm:
                            await websocket.send_bytes(pcm)
                
                if interrupt_event.is_set() or gen_id != current_generation_id:
                    break

            # Flush any remaining text in the buffer
            if not interrupt_event.is_set() and gen_id == current_generation_id:
                remaining_sentences = sentence_buffer.flush()
                for sentence in remaining_sentences:
                    if sentence.strip():
                        # Skip if we've already processed this sentence
                        sentence_key = sentence.strip()
                        if sentence_key in processed_sentences:
                            continue
                        processed_sentences.add(sentence_key)
                        
                        # Clean sentence for TTS - preserve decimal numbers but remove sentence punctuation
                        clean_sentence = sentence.strip()
                        
                        # Replace multiple periods (ellipsis) with comma
                        clean_sentence = clean_sentence.replace('...', ',')
                        
                        # Remove sentence-ending periods but preserve decimal points
                        # Replace period at end of sentence or followed by space (but not in numbers)
                        clean_sentence = re.sub(r'\.(?!\d)', '', clean_sentence)
                        
                        # Remove other trailing punctuation
                        while clean_sentence and clean_sentence[-1] in '!?,;:':
                            clean_sentence = clean_sentence[:-1]
                        
                        if clean_sentence:  # Only process if there's text left
                            # Generate TTS audio with cleaned sentence
                            clean_sentence = clean_sentence.lower()
                            pcm = await _tts_sentence_to_pcm(tts_service, clean_sentence, interrupt_event, gen_id, current_generation_id)
                            
                            if not (interrupt_event.is_set() or gen_id != current_generation_id):
                                if pcm:
                                    await websocket.send_bytes(pcm)
                        # Replace single periods with nothing (natural pause at sentence end)
                        # clean_sentence = clean_sentence.replace('.', '')
                        # # Remove other trailing punctuation
                        # while clean_sentence and clean_sentence[-1] in '!?,;:':
                        #     clean_sentence = clean_sentence[:-1]
                        
                        # if clean_sentence:  # Only process if there's text left
                        #     # Generate TTS audio with cleaned sentence
                        #     pcm = await _tts_sentence_to_pcm(tts_service, clean_sentence, interrupt_event, gen_id, current_generation_id)
                            
                        #     if not (interrupt_event.is_set() or gen_id != current_generation_id):
                        #         if pcm:
                        #             await websocket.send_bytes(pcm)
            
            # Send the complete agent response as a single transcript at the end
            if not interrupt_event.is_set() and gen_id == current_generation_id:
                if full_ai_response:
                    # Send the full response as one transcript message
                    await websocket.send_json({"type": "assistant_transcript", "text": full_ai_response, "is_user": False})
                    
                    # Save AI response to history using transcript service
                    await transcript_service.store_agent_message(session_id, full_ai_response)
                    
                    # Save AI response to session database
                    await session_service.add_message(session_id, full_ai_response, is_user=False)
                    
                    # Auto-generate title after first exchange (when message count == 2)
                    messages = await session_service.get_session_messages(session_id)
                    if len(messages) == 2:
                        await session_service.auto_title(session_id)
                    
                    metrics.stop_timing("llm_generation")
                    metrics.stop_timing("total_turnaround")
                    await websocket.send_json({"type": "metrics", "data": metrics.get_all()})
                else:
                    # If no response was generated, send empty transcript to clear loading state
                    await websocket.send_json({"type": "assistant_transcript", "text": "I apologize, I couldn't generate a response.", "is_user": False})
                    
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
                elif msg.get("type") == "set_response_mode":
                    mode = msg.get("mode")
                    if mode in ["faster", "planning", "detailed"]:
                        llm_service.set_response_mode(mode)
                        
                        # Update metrics with new model name
                        mode_config = {
                            "faster": "llama-3.1-8b-instant",
                            "planning": "llama-3.3-70b-versatile",
                            "detailed": "llama-3.3-70b-versatile"
                        }
                        metrics.set_model(mode_config[mode])
                        
                        # Send updated metrics to client
                        await websocket.send_json({"type": "metrics", "data": metrics.get_all()})
                        await websocket.send_json({"type": "status", "text": f"Response mode set to {mode}"})
                    else:
                        await websocket.send_json({"type": "error", "text": "Invalid response mode"})
                elif msg.get("type") == "text_input":
                    # Handle typed text messages (same as voice input)
                    text_message = msg.get("text", "").strip()
                    if text_message:
                        # Sanitize the text input
                        clean_text = sanitize_transcript(text_message)
                        if clean_text:
                            # Process as if it was a voice transcript
                            await stt_callback(clean_text, is_final=True)
                    
    except WebSocketDisconnect:
        logger.info(f"Client disconnected: {device_id}")
    except Exception as e:
        logger.error(f"WebSocket Error: {e}")
    finally:
        if active_connections.get(device_id) == websocket:
            del active_connections[device_id]
            
        if stt_service:
            await stt_service.stop()
        await session_service.disconnect()
