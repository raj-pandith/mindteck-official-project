from db import collection, windows_collection
from realtime.filter import RealTimeBandpassFilter
from realtime.buffer import ECGBuffer
from realtime.validator import is_valid_window
import numpy as np
from model_service import run_inference
import queue
import asyncio
from datetime import datetime, timedelta
from pymongo import ReturnDocument
from websocketconn import ConnectionManager

manager = ConnectionManager()
main_loop = asyncio.get_event_loop()

user_states = {}
window_queue = queue.Queue(maxsize=100)



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

def reset_user_state(user_id):
    if user_id in user_states:
        state = user_states[user_id]

        state["buffer"].buffer = []

        if hasattr(state["filter"], "reset"):
            state["filter"].reset()

        state["last_timestamp"] = None

        print(f"Reset state for {user_id}")


def watch_inserts():
    print("Watching MongoDB inserts...")

    with collection.watch() as stream:
        for change in stream:

            if change["operationType"] != "insert":
                continue

            doc = change["fullDocument"]

            meta = doc.get("metaData", {})
            doctor_id = str(meta.get("doctorId", "")).strip()
            patient_id = str(meta.get("patientId", "")).strip()
            EcgMonitoringTime = meta.get("ecgMonitoringTime", 0)
            if not doctor_id or not patient_id:
                print("Missing doctorId/patientId")
                continue

            user_id = f"{doctor_id}_{patient_id}"

            state = get_user_state(user_id)
            rt_filter = state["filter"]
            ecg_buffer = state["buffer"]

            arrival_time = parse_timestamp(meta)
            state["last_timestamp"] = arrival_time

            raw_value = doc.get("lead2")
            if raw_value is None:
                continue

            filtered = rt_filter.process(float(raw_value))

            if manager and main_loop:
                data = {
                    "type": "LIVE_SAMPLE",
                    "value": filtered,
                    "timestamp": arrival_time.isoformat(),
                    "user_id": user_id,
                    "EcgMonitoringTime": EcgMonitoringTime
                }
                asyncio.run_coroutine_threadsafe(
                    manager.broadcast_to_user(
                        doctor_id,
                        patient_id,
                        data
                    ),
                    main_loop
                )

            ecg_buffer.add(filtered)

            if not ecg_buffer.is_full():
                continue

            window = ecg_buffer.get_window()

            is_valid, r_count = is_valid_window(window)

            if not is_valid:
                print(f"[{user_id}] Skipping window ({r_count} peaks)")
                ecg_buffer.buffer = slide_buffer(ecg_buffer.buffer)
                continue

            window_id = generate_window_id(user_id, arrival_time)

            try:
                window_queue.put(
                    (window_id, user_id, window.copy(), arrival_time,EcgMonitoringTime),
                    timeout=1
                )
                print(f"[{user_id}] Window queued: {window_id}")
            except queue.Full:
                print("Queue full, dropping window")

            ecg_buffer.buffer = slide_buffer(ecg_buffer.buffer)



def process_windows():
    # global manager, main_loop

    window_duration = 5

    while True:
        item = window_queue.get()

        try:
            window_id, user_id, window, actual_end_time, EcgMonitoringTime = item

            print(f"[{user_id}] Processing {window_id}")

            window_np = np.array(window, dtype=np.float32)

            result = run_inference(window_np)

            segment = result["segments"][0]

            label = segment.get("label", "UNKNOWN")
            prob = float(segment.get("prob_af", 0))

            ecg_signal = window

            end_time = actual_end_time
            start_time = end_time - timedelta(seconds=window_duration)

            id_parts = user_id.split("_")
            doctor_id = id_parts[0] if len(id_parts) > 0 else "unknown"
            patient_id = id_parts[1] if len(id_parts) > 1 else "unknown"

            window_segment = {
                "window_id": window_id,
                "start_time": start_time,
                "end_time": end_time,
                "ecg_signal": ecg_signal,
                "label": label,
                "prob_af": prob
            }

            if prob >= 0.5:
                af_inc = 1
                normal_inc = 0
            else:
                af_inc = 0
                normal_inc = 1

            updated_doc = windows_collection.find_one_and_update(
                { "user_id": user_id },
                {
                    "$setOnInsert": {
                        "doctor_id": doctor_id,
                        "patient_id": patient_id,
                        "session_start": start_time,
                        "EcgMonitoringTime": EcgMonitoringTime
                    },
                    "$set": {
                        "session_end": end_time,
                        "latest_analysis": {
                            "overall_label": label,
                            "overall_prob_af": prob
                        }
                    },
                    "$push": {
                        "window_history": window_segment
                    },
                    "$inc": {
                        "version": 1,
                        "af_count": af_inc,
                        "normal_count": normal_inc
                    }
                },
                upsert=True,
                return_document=ReturnDocument.AFTER 
            )

            af_count = updated_doc.get("af_count", 0)
            normal_count = updated_doc.get("normal_count", 0)

            data = {
                "type": "WINDOW_RESULT",
                "window_id": window_id,
                "user_id": user_id,
                "ecg": ecg_signal,
                "prediction": label,
                "confidence": prob,
                "timestamp": actual_end_time.isoformat(),
                "EcgMonitoringTime": EcgMonitoringTime,
                "af_count": af_count,
                "normal_count": normal_count,
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

