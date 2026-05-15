from db import collection, windows_collection
from realtime.filter import RealTimeBandpassFilter
from realtime.buffer import ECGBuffer
from realtime.validator import is_valid_window
import numpy as np
from model_service import run_inference
import queue
import asyncio
from datetime import datetime, timedelta

window_queue = queue.Queue(maxsize=50)

RESET_THRESHOLD = 5

main_loop = None
manager = None


def slide_buffer(buffer, step=300):
    return buffer[step:] if len(buffer) > step else []


# ✅ NEW: window_id generator
def generate_window_id(user_id, timestamp):
    if not isinstance(timestamp, datetime):
        timestamp = datetime.utcnow()

    return f"{user_id}_{timestamp.strftime('%Y%m%d%H%M%S%f')}"


def watch_inserts():
    print("Watching MongoDB inserts...")

    rt_filter = RealTimeBandpassFilter()
    ecg_buffer = ECGBuffer(fs=360, window_sec=5)

    last_timestamp = None

    with collection.watch() as stream:
        for change in stream:

            if change["operationType"] != "insert":
                continue

            doc = change["fullDocument"]

            user_id = doc.get("user_id", "unknown_user")

            arrival_time = doc.get("timestamp") or datetime.utcnow()
            if not isinstance(arrival_time, datetime):
                arrival_time = datetime.utcnow()

            if last_timestamp:
                gap = (arrival_time - last_timestamp).total_seconds()

                if gap > RESET_THRESHOLD:
                    print(f"\nInactivity detected ({gap:.2f}s) → Resetting buffer")

                    ecg_buffer.buffer = []

                    if hasattr(rt_filter, "reset"):
                        rt_filter.reset()
                    

            last_timestamp = arrival_time

            raw_value = doc.get("lead2")
            if raw_value is None:
                continue

            filtered = rt_filter.process(float(raw_value))

            if manager and main_loop:
                sample_data = {
                    "type": "LIVE_SAMPLE",
                    "value": filtered,
                    "timestamp": arrival_time.isoformat(),
                    "user_id": user_id
                }
                asyncio.run_coroutine_threadsafe(
                    manager.broadcast(sample_data),
                    main_loop
                )

            ecg_buffer.add(filtered)

            if not ecg_buffer.is_full():
                continue

            window = ecg_buffer.get_window()

            is_valid, r_count = is_valid_window(window)

            if not is_valid:
                print(f"Skipping window (only {r_count} R-peaks)")
                ecg_buffer.buffer = slide_buffer(ecg_buffer.buffer)
                continue

            window_id = generate_window_id(user_id, arrival_time)

            try:
                window_queue.put(
                    (window_id, user_id, window.copy(), arrival_time),
                    timeout=1
                )
                print(f"Added window {window_id} | Queue size: {window_queue.qsize()}")
            except queue.Full:
                print("Queue full, dropping window")

            ecg_buffer.buffer = slide_buffer(ecg_buffer.buffer)


def process_windows():
    global manager, main_loop

    window_duration = 5

    while True:
        item = window_queue.get()

        try:
            window_id, user_id, window, actual_end_time = item

            print(f"\n⚙️ Processing window {window_id}...")

            window_np = np.array(window, dtype=np.float32).reshape(1, -1)

            result = run_inference(window_np[0])

            print("MODEL OUTPUT:", result)

            segment = result["segments"][0]

            label = segment.get("label", "UNKNOWN")
            prob = float(segment.get("prob_af", 0))

            ecg_signal = window.tolist() if isinstance(window, np.ndarray) else window

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

            print(f"Saved window {window_id} to MongoDB")

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
                    manager.broadcast(data),
                    main_loop
                )

        except Exception as e:
            print("Error processing window:", e)

        finally:
            window_queue.task_done()