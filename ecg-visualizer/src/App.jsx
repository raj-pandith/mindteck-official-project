import React, { useEffect, useRef, useState } from "react";
import DataIngestionForm from "./components/DataIngestionForm";
import LiveECGChart from "./components/LiveECGChart";
import WindowHistoryStrip from "./components/WindowHistoryStrip";
import WindowDetailPanel from "./components/WindowDetailPanel";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [seconds, setSeconds] = useState(5);
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [reportId, setReportId] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [totalSamples, setTotalSamples] = useState(0);
  const [windows, setWindows] = useState([]);
  const [selectedWindow, setSelectedWindow] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [liveData, setLiveData] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [currentFileName, setCurrentFileName] = useState("");

  const scrollRef = useRef(null);
  const liveScrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: "smooth",
      });
    }
  }, [windows]);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const resetECGState = () => {
    setLiveData([]);
    setWindows([]);
    setSelectedWindow(null);
    setSelectedId(null);
    setTotalSamples(0);
  };

  const handleSubmit = async () => {
    if (!selectedFile || !patientId || !doctorId) {
      alert("File, Patient ID and Doctor ID are required");
      return;
    }

    try {
      await fetch(
        `http://localhost:8000/reset?doctor_id=${doctorId}&patient_id=${patientId}`,
        { method: "POST" }
      );

      resetECGState();
      setCurrentFileName(selectedFile.name);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("seconds", seconds);
      formData.append("patientId", patientId);
      formData.append("doctorId", doctorId);

      setUploading(true);

      const response = await fetch("http://localhost:8081/dataset/simulation/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const rId = await response.text();
        setReportId(rId);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        const errorText = await response.text();
        alert("Upload failed: " + errorText);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Server connection error.");
    } finally {
      setUploading(false);
    }
  };

  const fetchWindowDetails = async (windowId) => {
    setSelectedId(windowId);
    setLoadingDetail(true);
    try {
      const res = await fetch(`http://localhost:8000/window/${windowId}`);
      const data = await res.json();
      setSelectedWindow(data);
    } catch (err) {
      console.error("Error fetching window:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Dedicated WebSocket Engine
  useEffect(() => {
    if (!reportId) return;

    console.log("Connecting WS with reportId:", reportId);
    const ws = new WebSocket(`ws://localhost:8000/ws/${doctorId}/${patientId}`);

    ws.onopen = () => console.log("✅ WebSocket CONNECTED");
    ws.onerror = (err) => console.error("❌ WebSocket ERROR:", err);
    ws.onclose = (event) => console.warn("⚠️ WebSocket CLOSED:", event);

    let counter = 0;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "LIVE_SAMPLE") {
        counter++;
        setTotalSamples((prev) => prev + 1);
        if (counter % 2 !== 0) return;

        setLiveData((prev) => {
          const updated = [...prev, { index: prev.length, value: msg.value }];
          return updated.length > 3000 ? updated.slice(-3000) : updated;
        });

        if (liveScrollRef.current) {
          liveScrollRef.current.scrollLeft = liveScrollRef.current.scrollWidth;
        }
      } else if (msg.type === "WINDOW_RESULT") {
        setWindows((prev) => {
          const exists = prev.find((w) => w.window_id === msg.window_id);
          if (exists) return prev;
          return [...prev, msg];
        });
      }
    };

    return () => {
      console.log("🔌 Closing WS");
      ws.close();
    };
  }, [reportId]);

  return (
    <div style={{ padding: "20px", backgroundColor: "#0a0a0a", minHeight: "100vh", color: "#0f0" }}>
      <h2 style={{ textAlign: "center", textTransform: "uppercase", letterSpacing: "2px" }}>
        ECG MONITOR SYSTEM
      </h2>

      <DataIngestionForm
        fileInputRef={fileInputRef}
        handleFileChange={handleFileChange}
        uploading={uploading}
        patientId={patientId}
        setPatientId={setPatientId}
        doctorId={doctorId}
        setDoctorId={setDoctorId}
        seconds={seconds}
        setSeconds={setSeconds}
        handleSubmit={handleSubmit}
        selectedFile={selectedFile}
      />

      {currentFileName && (
        <div style={{ marginBottom: "20px", color: "#0f0", fontSize: "13px" }}>
          CURRENT DATASET: <strong>{currentFileName}</strong> {reportId && `| REPORT ID: ${reportId}`}
        </div>
      )}

      <LiveECGChart
        liveScrollRef={liveScrollRef}
        liveData={liveData}
      />

      <WindowHistoryStrip
        windows={windows}
        selectedId={selectedId}
        fetchWindowDetails={fetchWindowDetails}
        scrollRef={scrollRef}
      />

      <WindowDetailPanel
        selectedWindow={selectedWindow}
        loadingDetail={loadingDetail}
        setSelectedWindow={setSelectedWindow}
      />
    </div>
  );
}

export default App;