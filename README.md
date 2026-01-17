# AI Voice Assistant

A production-ready, low-latency voice assistant built with Python (FastAPI) and React.

## Features
- **Low Latency**: Sub-second response times using Groq, Deepgram, and Cartesia.
- **Custom Pipeline**: In-house VAD and Noise Suppression.
- **Multi-User**: Scalable WebSocket-based session management.
- **Real-time Context**: Dynamic mid-session instruction updates.

## Architecture
- **Backend**: FastAPI (Python)
- **Frontend**: React (Vite) + Tailwind CSS
- **STT**: Deepgram
- **LLM**: Groq (Llama 3)
- **TTS**: Cartesia

## Setup
1. Clone the repository.
2. Install server dependencies: `pip install -r server/requirements.txt`.
3. Install client dependencies: `cd client && npm install`.
4. Configure `.env` in the `server` directory.
5. Run the server: `python server/app/main.py`.
6. Run the client: `npm run dev`.
