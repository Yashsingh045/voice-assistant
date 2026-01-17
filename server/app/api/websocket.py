from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

manager = ConnectionManager()

@router.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    logger.info("New WebSocket connection established")
    try:
        while True:
            # Receive audio as bytes
            data = await websocket.receive_bytes()
            # In Phase 1, we just log the received data size
            # Audio pipeline will be implemented in Day 2
            logger.debug(f"Received {len(data)} bytes of audio data")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("WebSocket connection closed")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)
