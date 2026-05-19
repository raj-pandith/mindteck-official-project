from __future__ import annotations

import io
import tempfile
from pathlib import Path
from typing import List

import numpy as np
import torch
import torch.nn as nn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from fastapi import WebSocket, WebSocketDisconnect
import asyncio
from websocketconn import ConnectionManager
import change_stream
from db import windows_collection
import threading
from change_stream import watch_inserts, process_windows
from model_service import (
    run_inference,
    DEFAULT_THRESHOLD
)


main_loop = None


manager = ConnectionManager()

app = FastAPI(
    title="ECG AF Detection API",
    description="Atrial Fibrillation detection from ECG signal windows using a 1-D CNN.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.on_event("startup")
async def start_change_stream():
    global main_loop

    main_loop = asyncio.get_running_loop()

    change_stream.main_loop = main_loop
    change_stream.manager = manager

    threading.Thread(target=watch_inserts, daemon=True).start()
    threading.Thread(target=process_windows, daemon=True).start()

    print("🚀 Background threads started and manager injected.")

class PredictJsonRequest(BaseModel):
    windows: List[List[float]] = Field(
        ...,
        description="List of ECG signal windows. Each inner list is one segment.",
        example=[[0.1, 0.2, -0.1, 0.0]],
    )
    threshold: float = Field(
        DEFAULT_THRESHOLD,
        ge=0.0, le=1.0,
        description="Classification threshold for P(AF). Default 0.5.",
    )

from change_stream import reset_user_state

@app.post("/reset")
async def reset(doctor_id: str, patient_id: str):
    user_id = f"{doctor_id}_{patient_id}"

    print(f"Reset for {user_id}")

    # ✅ Reset only this user's buffer + filter
    reset_user_state(user_id)

    return {"status": "reset done"}

@app.get("/health", tags=["Utility"])
def health():
    """Liveness / readiness check."""
    return {"status": "ok", "device": str(DEVICE)}


@app.post("/predict/json", tags=["Prediction"])
def predict_from_json(body: PredictJsonRequest):

    try:
        X = np.array(body.windows, dtype=np.float32)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not parse windows: {exc}")

    try:
        result = run_inference(X, threshold=body.threshold)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference error: {exc}")

    return result

@app.websocket("/ws/{doctor_id}/{patient_id}")
async def websocket_endpoint(websocket: WebSocket, doctor_id: str, patient_id: str):
    await manager.connect(doctor_id, patient_id, websocket)

    try:
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(doctor_id, patient_id)
        print(f"Disconnected: {doctor_id}_{patient_id}")

@app.get("/windows")
def get_windows():
    data = list(
        windows_collection.find({}, {"_id": 0}).sort("window_id", 1)
    )
    return data

from fastapi import HTTPException

@app.get("/window/{window_id}")
def get_window(window_id: str):
    doc = windows_collection.find_one({"window_id": window_id})

    if not doc:
        raise HTTPException(status_code=404, detail="Window not found")

    # Convert Mongo _id to string
    doc["_id"] = str(doc["_id"])

    return doc