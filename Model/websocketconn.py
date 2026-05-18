import json

from fastapi import WebSocket
class ConnectionManager:
    def __init__(self):
        self.connections = {}  # { "doctor_patient": websocket }

    async def connect(self, doctor_id: str, patient_id: str, websocket: WebSocket):
        await websocket.accept()

        key = f"{doctor_id}_{patient_id}"
        self.connections[key] = websocket

        print(f"CONNECTED: {key}")

    def disconnect(self, doctor_id: str, patient_id: str):
        key = f"{doctor_id}_{patient_id}"

        if key in self.connections:
            del self.connections[key]

        print(f"DISCONNECTED: {key}")

    async def broadcast_to_user(self, doctor_id: str, patient_id: str, data):
        key = f"{doctor_id}_{patient_id}"

        websocket = self.connections.get(key)

        if websocket:
            try:
                await websocket.send_json(data)
            except Exception as e:
                print("Send error:", e)
                self.disconnect(doctor_id, patient_id)