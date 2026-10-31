import json
import asyncio
from typing import List, Optional
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.main_loop: Optional[asyncio.AbstractEventLoop] = None

    async def connect(self, websocket: WebSocket):
        self.main_loop = asyncio.get_running_loop()
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        text_data = json.dumps(message)
        for connection in list(self.active_connections):
            try:
                await connection.send_text(text_data)
            except Exception:
                self.disconnect(connection)

    def broadcast_sync(self, message: dict):
        """Thread-safe synchronous broadcast callable from background worker threads"""
        if self.main_loop and self.main_loop.is_running():
            try:
                asyncio.run_coroutine_threadsafe(self.broadcast(message), self.main_loop)
                return
            except Exception:
                pass

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.run_coroutine_threadsafe(self.broadcast(message), loop)
            else:
                loop.run_until_complete(self.broadcast(message))
        except Exception:
            try:
                new_l = asyncio.new_event_loop()
                new_l.run_until_complete(self.broadcast(message))
                new_l.close()
            except Exception:
                pass

ws_manager = ConnectionManager()
