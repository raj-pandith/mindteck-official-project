from db import collection, windows_collection
from realtime.filter import RealTimeBandpassFilter
from realtime.buffer import ECGBuffer
from realtime.validator import is_valid_window
import numpy as np
from model_service import run_inference
import queue
import asyncio
from datetime import datetime, timedelta

# =========================
# GLOBALS
# =========================

RESET_THRESHOLD = 5

main_loop = None
manager = None

# 🔥 PER-USER STATE (doctorId + patientId)
user_states = {}

# 🔥 SHARED QUEUE (can also be per-user if needed)
window_queue = queue.Queue(maxsize=100)


# =========================
# HELPERS
# =========================

def slide_buffer(buffer, step=300):
    return buffer[step:] if len(buffer) > step else []


def generate_window_id(user_id, timestamp):
    if not isinstance(timestamp, datetime):
        timestamp = datetime.utcnow()
    return f"{user_id}_{timestamp.strftime('%Y%m%d%H%M%S%f')}"


def get_user_state(user_id):
    if user_id not in user_states:
        user_states[user_id] = {
            "filter": RealTimeBandpassFilter(),
            "buffer": ECGBuffer(fs=360, window_sec=5),
            "last_timestamp": None
        }
    return user_states[user_id]


def parse_timestamp(meta):
    ts = meta.get("timestamp")

    if isinstance(ts, dict) and "$numberLong" in ts:
        return datetime.utcfromtimestamp(int(ts["$numberLong"]) / 1000)
    elif isinstance(ts, (int, float)):
        return datetime.utcfromtimestamp(ts / 1000)
    else:
        return datetime.utcnow()


# =========================
# WATCH MONGODB STREAM
# =========================

def watch_inserts():
    print("Watching MongoDB inserts...")

    with collection.watch() as stream:
        for change in stream:

            if change["operationType"] != "insert":
                continue

            doc = change["fullDocument"]

            # 🔥 Extract doctor + patient
            meta = doc.get("metaData", {})
            doctor_id = str(meta.get("doctorId", "")).strip()
            patient_id = str(meta.get("patientId", "")).strip()
            if not doctor_id or not patient_id:
                print("❌ Missing doctorId/patientId")
                continue

            user_id = f"{doctor_id}_{patient_id}"

            # 🔥 Get per-user state
            state = get_user_state(user_id)
            rt_filter = state["filter"]
            ecg_buffer = state["buffer"]
            last_timestamp = state["last_timestamp"]

            arrival_time = parse_timestamp(meta)
            # 🔥 Inactivity reset
            if last_timestamp:
                gap = (arrival_time - last_timestamp).total_seconds()
                if gap > RESET_THRESHOLD:
                    print(f"[{user_id}] Inactivity ({gap:.2f}s) → Reset")
                    ecg_buffer.buffer = []
                    if hasattr(rt_filter, "reset"):
                        rt_filter.reset()

            state["last_timestamp"] = arrival_time

            raw_value = doc.get("lead2")
            if raw_value is None:
                continue

            # 🔥 FILTER
            filtered = rt_filter.process(float(raw_value))

            # 🔥 SEND LIVE SAMPLE (ISOLATED)
            if manager and main_loop:
                data = {
                    "type": "LIVE_SAMPLE",
                    "value": filtered,
                    "timestamp": arrival_time.isoformat(),
                    "user_id": user_id
                }
                asyncio.run_coroutine_threadsafe(
                    manager.broadcast_to_user(
                        doctor_id,
                        patient_id,
                        data
                    ),
                    main_loop
                )

            # 🔥 BUFFER
            ecg_buffer.add(filtered)

            if not ecg_buffer.is_full():
                continue

            window = ecg_buffer.get_window()

            # 🔥 VALIDATION
            is_valid, r_count = is_valid_window(window)

            if not is_valid:
                print(f"[{user_id}] Skipping window ({r_count} peaks)")
                ecg_buffer.buffer = slide_buffer(ecg_buffer.buffer)
                continue

            window_id = generate_window_id(user_id, arrival_time)

            try:
                window_queue.put(
                    (window_id, user_id, window.copy(), arrival_time),
                    timeout=1
                )
                print(f"[{user_id}] Window queued: {window_id}")
            except queue.Full:
                print("Queue full, dropping window")

            ecg_buffer.buffer = slide_buffer(ecg_buffer.buffer)


# =========================
# PROCESS WINDOWS
# =========================

def process_windows():
    global manager, main_loop

    window_duration = 5

    while True:
        item = window_queue.get()

        try:
            window_id, user_id, window, actual_end_time = item

            print(f"[{user_id}] Processing {window_id}")

            window_np = np.array(window, dtype=np.float32)

            result = run_inference(window_np)

            segment = result["segments"][0]

            label = segment.get("label", "UNKNOWN")
            prob = float(segment.get("prob_af", 0))

            ecg_signal = window

            end_time = actual_end_time
            start_time = end_time - timedelta(seconds=window_duration)

            db_doc = {
                "window_id": window_id,
                "user_id": user_id,
                "start_time": start_time,
                "end_time": end_time,
                "ecg_signal": ecg_signal,
                "label": label,
                "prob_af": prob
            }

            windows_collection.insert_one(db_doc)

            # 🔥 SEND RESULT ONLY TO THAT USER
            # 🔥 SEND RESULT ONLY TO THAT USER
            # 🔥 Extract doctor & patient
            doctor_id, patient_id = user_id.split("_")

            # 🔥 SEND RESULT ONLY TO THAT USER
            data = {
                "type": "WINDOW_RESULT",
                "window_id": window_id,
                "user_id": user_id,
                "ecg": ecg_signal,
                "prediction": label,
                "confidence": prob,
                "timestamp": actual_end_time.isoformat()
            }

            if manager and main_loop:
                asyncio.run_coroutine_threadsafe(
                    manager.broadcast_to_user(doctor_id, patient_id, data),
                    main_loop
                )

        except Exception as e:
            print("Error processing window:", e)

        finally:
            window_queue.task_done()


# =========================
# WEBSOCKET MANAGER
# =========================

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
        print("♻️ Clearing all connections")
        self.connections.clear()