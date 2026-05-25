from fastapi import WebSocket
# This class manages WebSocket connections for doctor-patient communication. It allows for connecting, disconnecting, and broadcasting messages to all connected clients for a specific doctor-patient pair. The connections are stored in a dictionary where the key is a combination of doctor_id and patient_id, and the value is a list of WebSocket connections. The class also includes a method to clear all connections, which can be useful for cleanup or resetting the state.
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