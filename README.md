# Production-Ready Voice Assistant

A low-latency, real-time voice assistant built with a cascaded pipeline. Features include custom noise suppression, VAD, real-time transcription, and a modular architecture supporting concurrent users.

## 🚀 Architecture Overview

### The Cascade Pipeline
```
User Audio → [Noise Suppression] → [Custom VAD] → [Deepgram STT] → [Groq/Gemini LLM + Tools] → [Cartesia TTS] → AI Audio
```

1.  **Noise Suppression**: Custom RMS-based filtering and high-pass filters implemented in `audio_utils.py` and `vad-processor.js`.
2.  **Custom VAD**: Implemented via `AudioWorkletProcessor` on the client side for ultra-low latency detection of speech start/end.
3.  **STT (Deepgram)**: Fast, streaming speech-to-text.
4.  **LLM (Groq + Gemini Fallback)**: Primarily uses Groq (Llama-3) for sub-second speeds. Automatically falls back to Google Gemini if Groq is unavailable.
5.  **Tools (Tavily)**: Real-time web search capabilities for current information.
6.  **TTS (Cartesia)**: Low-latency streaming text-to-speech with high-quality voices.

### Multi-User Scalability
- **Session Isolation**: Each WebSocket connection is assigned a unique UUID. Services (LLM, STT, TTS) are instantiated per session to ensure zero context bleed.
- **Resource Efficiency**: Uses non-blocking asynchronous programming (FastAPI/asyncio) to handle hundreds of concurrent connections on a single instance.
- **State Management**: Conversation history and smart caching are persisted in Redis, allowing the system to scale horizontally across multiple web nodes.

## 🛠️ Design Decisions

- **WebSockets over HTTP**: Essential for full-duplex, low-latency communication required for "barge-in" support.
- **Client-side VAD**: Offloading speech detection to the client browser reduces server load and provides immediate UI feedback.
- **Structured Logging**: Uses JSON formatting with correlation IDs for production traceability.
- **Observability**: Real-time metrics dashboard tracks TTFT (Time To First Token) and E2E latency.

## 📈 Performance Analysis

- **System Init**: < 2s
- **E2E Latency**: ~800ms - 1.5s (depending on network)
- **Barge-In**: Interrupts triggered in < 200ms.

## 🛡️ Security & Resilience

- **Rate Limiting**: Implemented session-per-IP limits to prevent automated abuse and resource exhaustion.
- **Provider Fallback**: Multi-LLM provider support (Groq/Gemini) ensures high availability.
- **Error Recovery**: STT/TTS services include automatic retry logic with exponential backoff.
- **Docker Hardening**: Internal services (Redis) are shielded from public exposure.

## 📦 Setup & Installation

1.  **Clone the Repo**
2.  **Backend Setup**:
    ```bash
    cd server
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    python app/main.py
    ```
3.  **Frontend Setup**:
    ```bash
    cd client
    npm install
    npm run dev
    ```
4.  **Configuration**: Copy `.env.example` to `.env` and provide your API keys.

---
*Built for iterative engineering assignment.*
