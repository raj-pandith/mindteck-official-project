from __future__ import annotations

import io
import tempfile
from pathlib import Path
from typing import List
import json
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
from bson import json_util

from fastapi.responses import FileResponse
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter
import os
from fastapi.responses import StreamingResponse
main_loop = None

from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter
import io
from fastapi import Response

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


@app.get("/window/{patient_id}/{window_id}")
async def get_patient_window_segment(patient_id: str, window_id: str):
    try:
        document = windows_collection.find_one(
            {
                "patient_id": patient_id,
                "window_history.window_id": window_id
            },
            {
                "window_history": {"$elemMatch": {"window_id": window_id}},
                "_id": 0 
            }
        )
        
        if not document or "window_history" not in document or not document["window_history"]:
            raise HTTPException(
                status_code=404, 
                detail=f"ECG window footprint tracking '{window_id}' not found for patient '{patient_id}'."
            )
            
        matched_window = document["window_history"][0]
        sanitized_json = json.loads(json_util.dumps(matched_window))
        
        return sanitized_json

    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        print(f"[FATAL EXCEPTION CRASH] Error log profile trace: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Internal aggregation engine breakdown: {str(e)}"
        )


@app.get("/af-segments-agg")
def get_af_segments_agg(doctor_id: str, patient_id: str):
    user_id = f"{doctor_id}_{patient_id}"

    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$unwind": "$window_history"},
        {"$match": {"window_history.label": "AF"}},
        {
            "$project": {
                "_id": 0,
                "window_id": "$window_history.window_id",
                "start_time": "$window_history.start_time",
                "end_time": "$window_history.end_time",
                "prob_af": "$window_history.prob_af",
                "ecg_signal": "$window_history.ecg_signal"
            }
        }
    ]

    results = list(windows_collection.aggregate(pipeline))

    return {
        "user_id": user_id,
        "total_af_segments": len(results),
        "af_segments": results
    }
@app.get("/generate-report")
def generate_report(doctor_id: str, patient_id: str):

    user_id = f"{doctor_id}_{patient_id}"

    # ✅ Fetch from MongoDB
    doc = windows_collection.find_one({"user_id": user_id})

    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")

    # ✅ Extract values safely
    af_count = doc.get("af_count", 0)
    normal_count = doc.get("normal_count", 0)

    total = af_count + normal_count
    af_percentage = (af_count / total * 100) if total > 0 else 0

    # ✅ Create PDF
    buffer = io.BytesIO()
    pdf = SimpleDocTemplate(buffer)
    styles = getSampleStyleSheet()

    content = []

    # Title
    content.append(Paragraph("ECG AF REPORT", styles["Title"]))
    content.append(Spacer(1, 20))

    # Patient Info
    content.append(Paragraph(f"Doctor ID: {doctor_id}", styles["Normal"]))
    content.append(Paragraph(f"Patient ID: {patient_id}", styles["Normal"]))
    content.append(Spacer(1, 15))

    # ECG Data
    content.append(Paragraph(f"AF Count: {af_count}", styles["Normal"]))
    content.append(Paragraph(f"Normal Count: {normal_count}", styles["Normal"]))
    content.append(Paragraph(f"Total Segments: {total}", styles["Normal"]))
    content.append(Spacer(1, 15))

    # Result
    content.append(Paragraph(f"AF Percentage: {af_percentage:.2f}%", styles["Heading2"]))

    pdf.build(content)

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={user_id}_report.pdf"}
    )