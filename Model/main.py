from __future__ import annotations

from fastapi import HTTPException
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
from reportlab.lib.pagesizes import letter
import os
from fastapi.responses import StreamingResponse
main_loop = None

from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter
import io
from fastapi import Response

from change_stream import reset_user_state
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
)
from reportlab.graphics.shapes import Drawing, Rect, Line, String

manager = ConnectionManager()

app = FastAPI(
    title="ECG AF Detection API",
    description="Atrial Fibrillation detection from ECG signal windows using a 1-D CNN.",
    version="1.0.0",
)

# middleaware to allow CORS from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.on_event("startup")
async def start_change_stream():
    '''Initialize the change stream listener and processing threads on application startup.'''
    global main_loop

    main_loop = asyncio.get_running_loop()

    change_stream.main_loop = main_loop
    change_stream.manager = manager

    threading.Thread(target=watch_inserts, daemon=True).start()
    threading.Thread(target=process_windows, daemon=True).start()

    print("Background threads started and manager injected.")

# Pydantic model for the JSON request body of the /predict/json endpoint
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


# Endpoint to reset the state for a specific doctor-patient pair, clearing all stored windows and resetting counts.
# this is happended each time a file is uploaded in frontend 
@app.post("/reset")
async def reset(doctor_id: str, patient_id: str):
    user_id = f"{doctor_id}_{patient_id}"

    print(f"Reset for {user_id}")
    
    windows_collection.delete_many(
        { "user_id": user_id }
    )
    reset_user_state(user_id)

    return {"status": "reset done"}

@app.get("/health", tags=["Utility"])
def health():
    return {"status": "ok", "device": str(DEVICE)}


# Prediction endpoint that accepts raw ECG windows in JSON format, runs inference, and returns results.
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

# WebSocket endpoint for real-time updates to clients. Clients connect with doctor_id and patient_id to receive updates specific to that pair.
@app.websocket("/ws/{doctor_id}/{patient_id}")
async def websocket_endpoint(websocket: WebSocket, doctor_id: str, patient_id: str):
    await manager.connect(doctor_id, patient_id, websocket)

    try:
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(doctor_id, patient_id)
        print(f"Disconnected: {doctor_id}_{patient_id}")

# Endpoint to retrieve all stored windows for debugging or review purposes.
@app.get("/windows")
def get_windows():
    data = list(
        windows_collection.find({}, {"_id": 0}).sort("window_id", 1)
    )
    return data


# Endpoint to retrieve a specific window segment for a given patient and window ID. This is used for detailed review of individual segments.
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

# Endpoint to retrieve aggregated AF segments for a given doctor-patient pair. This returns all segments labeled as AF along with their probabilities and timestamps.
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

# Endpoint to generate a PDF report for a specific doctor-patient pair. The report includes AF burden, risk assessment, and clinical interpretation based on the aggregated data.
@app.get("/generate-report")
def generate_report(doctor_id: str, patient_id: str):

    user_id = f"{doctor_id}_{patient_id}"
    doc = windows_collection.find_one({"user_id": user_id})

    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")

    af_count = doc.get("af_count", 0)
    normal_count = doc.get("normal_count", 0)
    total = af_count + normal_count
    af_percentage = (af_count / total * 100) if total > 0 else 0
    monitoring_seconds = doc.get("EcgMonitoringTime", 0)
    if af_percentage > 50:
        risk = "High AF Risk"
        risk_color = colors.HexColor("#C0392B")
    elif af_percentage > 20:
        risk = "Moderate Risk"
        risk_color = colors.HexColor("#E67E22")
    else:
        risk = "Low Risk"
        risk_color = colors.HexColor("#27AE60")

    buffer = io.BytesIO()

    pdf = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        topMargin=0.6 * inch,
        bottomMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
    )

    NAVY   = colors.HexColor("#1A3C5E")
    STEEL  = colors.HexColor("#2E86AB")
    LIGHT  = colors.HexColor("#EBF4FB")
    GREY   = colors.HexColor("#5D6D7E")
    RULE   = colors.HexColor("#BDC3C7")
    WHITE  = colors.white

    styles = getSampleStyleSheet()

    def style(name, **kw):
        s = ParagraphStyle(name, **kw)
        return s

    header_label = style("HeaderLabel",
        fontName="Helvetica", fontSize=8, textColor=WHITE, leading=10)

    header_value = style("HeaderValue",
        fontName="Helvetica-Bold", fontSize=9, textColor=WHITE, leading=11)

    section_title = style("SectionTitle",
        fontName="Helvetica-Bold", fontSize=10, textColor=NAVY,
        spaceBefore=10, spaceAfter=4)

    cell_label = style("CellLabel",
        fontName="Helvetica", fontSize=9, textColor=GREY)

    cell_value = style("CellValue",
        fontName="Helvetica-Bold", fontSize=11, textColor=NAVY)

    disclaimer_style = style("Disclaimer",
        fontName="Helvetica-Oblique", fontSize=7.5, textColor=GREY,
        leading=10, alignment=TA_CENTER)

    def hrule(color=RULE, thickness=0.5):
        d = Drawing(pdf.width, 1)
        d.add(Line(0, 0, pdf.width, 0,
                   strokeColor=color, strokeWidth=thickness))
        return d

    def metric_box(label, value, bg=LIGHT):
        tbl = Table(
            [[Paragraph(label, cell_label)],
             [Paragraph(str(value), cell_value)]],
            colWidths=[1.6 * inch],
        )
        tbl.setStyle(TableStyle([
            ("BACKGROUND",  (0, 0), (-1, -1), bg),
            ("ROUNDEDCORNERS", [4]),
            ("BOX",         (0, 0), (-1, -1), 0.5, RULE),
            ("TOPPADDING",  (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING",(0,0), (-1,-1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING",(0, 0), (-1, -1), 8),
        ]))
        return tbl

    content = []

    report_date = datetime.utcnow().strftime("%d %b %Y  %H:%M UTC")
    header_data = [
        [
            Paragraph("CARDIOLOGY DEPARTMENT", header_label),
            Paragraph("REPORT ID", header_label),
            Paragraph("DATE GENERATED", header_label),
        ],
        [
            Paragraph("ECG Atrial Fibrillation Analysis", header_value),
            Paragraph(user_id.upper(), header_value),
            Paragraph(report_date, header_value),
        ],
    ]
    header_tbl = Table(header_data,
                       colWidths=[pdf.width * 0.5,
                                  pdf.width * 0.25,
                                  pdf.width * 0.25])
    header_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), NAVY),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
        ("LINEBELOW",     (0, 0), (-1, 0), 0.5, STEEL),
    ]))
    content.append(header_tbl)
    content.append(Spacer(1, 14))

    content.append(Paragraph("PATIENT &amp; PHYSICIAN INFORMATION", section_title))
    content.append(hrule())
    content.append(Spacer(1, 6))

    info_data = [
        [Paragraph("Patient ID", cell_label),  Paragraph(patient_id, cell_value),
         Paragraph("Physician ID", cell_label), Paragraph(doctor_id, cell_value)],
        [Paragraph("Study Type", cell_label),
         Paragraph("Ambulatory ECG – AF Classification", cell_value),
         Paragraph("Classification", cell_label),
         Paragraph("Automated (AI-Assisted)", cell_value)],
    ]
    info_tbl = Table(info_data,
                     colWidths=[1.2*inch, 2.4*inch, 1.2*inch, 2.4*inch])
    info_tbl.setStyle(TableStyle([
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("LINEBELOW",     (0, 0), (-1, -1), 0.3, RULE),
    ]))
    content.append(info_tbl)
    content.append(Spacer(1, 14))

    content.append(Paragraph("ANALYSIS SUMMARY", section_title))
    content.append(hrule())
    content.append(Spacer(1, 8))

    metrics_row = [[
        metric_box("Monitoring Duration", f"{monitoring_seconds}s"),
        metric_box("AF Segments",     af_count),
        metric_box("Normal Segments", normal_count),
        metric_box("Total Segments",  total),
    ]]
    metrics_tbl = Table(metrics_row,
                        colWidths=[pdf.width / 4] * 4,
                        hAlign="CENTER")
    metrics_tbl.setStyle(TableStyle([
        ("LEFTPADDING",  (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
    ]))
    content.append(metrics_tbl)
    content.append(Spacer(1, 14))

    BAR_W = pdf.width
    BAR_H = 22

    bar_drawing = Drawing(BAR_W, BAR_H + 20)
    # background track
    bar_drawing.add(Rect(0, 10, BAR_W, BAR_H,
                         fillColor=colors.HexColor("#DDE6EE"),
                         strokeColor=None))
    fill_w = BAR_W * (af_percentage / 100)
    if fill_w > 0:
        bar_drawing.add(Rect(0, 10, fill_w, BAR_H,
                             fillColor=risk_color, strokeColor=None))
    # label
    bar_drawing.add(String(0, 2, "0%",
                           fontName="Helvetica", fontSize=7,
                           fillColor=GREY))
    bar_drawing.add(String(BAR_W - 14, 2, "100%",
                           fontName="Helvetica", fontSize=7,
                           fillColor=GREY))
    pct_label = f"{af_percentage:.1f}%"
    bar_drawing.add(String(max(fill_w - 28, 2), 14, pct_label,
                           fontName="Helvetica-Bold", fontSize=9,
                           fillColor=WHITE))

    content.append(Paragraph("AF BURDEN", section_title))
    content.append(hrule())
    content.append(Spacer(1, 6))
    content.append(bar_drawing)
    content.append(Spacer(1, 14))

    content.append(Paragraph("RISK ASSESSMENT", section_title))
    content.append(hrule())
    content.append(Spacer(1, 6))

    risk_style = ParagraphStyle("RiskValue",
        fontName="Helvetica-Bold", fontSize=16,
        textColor=risk_color, alignment=TA_CENTER)

    risk_pct_style = ParagraphStyle("RiskPct",
        fontName="Helvetica", fontSize=11,
        textColor=GREY, alignment=TA_CENTER)

    risk_data = [[
        Paragraph(risk, risk_style),
        Paragraph(f"AF Burden: {af_percentage:.2f}%", risk_pct_style),
    ]]
    risk_tbl = Table(risk_data, colWidths=[pdf.width * 0.5] * 2)
    risk_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, 0), colors.HexColor("#FDF2F2") if af_percentage > 50
                                  else colors.HexColor("#FEF9EC") if af_percentage > 20
                                  else colors.HexColor("#EAFAF1")),
        ("BACKGROUND",    (1, 0), (1, 0), LIGHT),
        ("BOX",           (0, 0), (-1, -1), 0.8, risk_color),
        ("LINEAFTER",     (0, 0), (0, 0), 0.5, RULE),
        ("TOPPADDING",    (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    content.append(risk_tbl)
    content.append(Spacer(1, 14))

    content.append(Paragraph("CLINICAL INTERPRETATION GUIDE", section_title))
    content.append(hrule())
    content.append(Spacer(1, 6))

    interp_header = ParagraphStyle("InterpH",
        fontName="Helvetica-Bold", fontSize=8.5, textColor=WHITE)
    interp_cell = ParagraphStyle("InterpC",
        fontName="Helvetica", fontSize=8.5, textColor=colors.black, leading=11)

    def _p(txt, st): return Paragraph(txt, st)

    interp_rows = [
        [_p("AF Burden", interp_header), _p("Risk Level", interp_header),
         _p("Recommended Action", interp_header)],
        [_p("&lt; 20%", interp_cell), _p("Low Risk", interp_cell),
         _p("Routine follow-up; lifestyle counselling", interp_cell)],
        [_p("20 – 50%", interp_cell), _p("Moderate Risk", interp_cell),
         _p("Cardiology review; consider rate/rhythm control", interp_cell)],
        [_p("&gt; 50%", interp_cell), _p("High AF Risk", interp_cell),
         _p("Urgent referral; anticoagulation evaluation", interp_cell)],
    ]
    interp_tbl = Table(interp_rows,
                       colWidths=[1.4*inch, 1.4*inch, pdf.width - 2.8*inch])
    interp_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), STEEL),
        ("BACKGROUND",    (0, 2), (-1, 2), LIGHT),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, LIGHT]),
        ("GRID",          (0, 0), (-1, -1), 0.4, RULE),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
    ]))
    content.append(interp_tbl)
    content.append(Spacer(1, 20))

    content.append(hrule(color=STEEL, thickness=1))
    content.append(Spacer(1, 5))
    pdf.build(content)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={user_id}_report.pdf"},
    )