from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.connections = {}

    async def connect(self, doctor_id, patient_id, websocket: WebSocket):
        await websocket.accept()
        key = f"{doctor_id}_{patient_id}"

        if key not in self.connections:
            self.connections[key] = []

        self.connections[key].append(websocket)
        print(f"CONNECTED: {key}")

    def disconnect(self, doctor_id, patient_id, websocket):
        key = f"{doctor_id}_{patient_id}"

        if key in self.connections:
            if websocket in self.connections[key]:
                self.connections[key].remove(websocket)

            if not self.connections[key]:
                del self.connections[key]

        print(f"DISCONNECTED: {key}")

    async def broadcast_to_user(self, doctor_id, patient_id, data):
        key = f"{doctor_id}_{patient_id}"

        for ws in self.connections.get(key, []):
            try:
                await ws.send_json(data)
            except:
                self.disconnect(doctor_id, patient_id, ws)

    def clear(self):
        print("Clearing all connections")
        self.connections.clear()