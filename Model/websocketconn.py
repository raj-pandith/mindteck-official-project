import json

class ConnectionManager:
    def __init__(self):
        self.active_connections = []

    async def connect(self, websocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data):
        for conn in self.active_connections[:]:
            try:
                await conn.send_text(json.dumps(data))
            except:
                self.disconnect(conn)