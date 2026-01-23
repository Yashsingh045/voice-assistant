# Sonic AI - Low-Latency Voice Assistant

A production-ready voice assistant pipeline optimized for low latency and high interactivity.

## Key Features
- **Ultra-Low Latency**: Sub-second T-FAP using Groq, Deepgram, and Cartesia with sentence-buffering streaming.
- **Barge-in Capability**: Interrupt the AI at any time. The system detects user voice start and instantly stops playback and generation.
- **Semantic Caching**: Redis-backed exact-match caching for near-instant responses to common queries.
- **Multi-User History**: Persistent chat sessions stored in Redis, isolated by `session_id`.
- **Real-time Context**: Update the assistant's persona or instructions mid-session via WebSocket messages.
- **Performance Dashboard**: Integrated real-time latency monitoring in the UI.

## Architecture
- **Backend**: FastAPI (Python)
- **Frontend**: React (Vite) + Vanilla CSS
- **STT**: Deepgram Nova-2
- **LLM**: Groq (Llama 3 70B)
- **TTS**: Cartesia Sonic
- **Memory/Cache**: Redis

## Getting Started

### Prerequisites
- Docker & Docker Compose
- API Keys: Deepgram, Groq, Cartesia, Tavily

### Quick Start (Docker)
1. Configure your keys in `server/.env`.
2. Run: `docker-compose up --build`
3. Access at `http://localhost:3000`

### Local Development
1. **Server**: `cd server && pip install -r requirements.txt && python app/main.py`
2. **Client**: `cd client && npm install && npm run dev`

