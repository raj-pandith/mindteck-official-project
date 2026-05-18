import React, { useEffect, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const monitorStyles = {
  scrollWrapper: {
    display: "flex",
    overflowX: "auto",
    backgroundColor: "#000",
    border: "3px solid #333",
    borderRadius: "8px",
    padding: "10px",
    cursor: "pointer",
    gap: "10px"
  },
  segmentBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    borderRight: "1px dashed rgba(0, 255, 0, 0.3)",
    padding: "0 10px",
    transition: "background 0.3s",
    minWidth: "320px"
  },
  detailPanel: {
    marginTop: "20px",
    padding: "20px",
    backgroundColor: "#111",
    border: "2px solid #00ff00",
    borderRadius: "8px",
    color: "#00ff00",
    fontFamily: "Courier New"
  }
};

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

  const formatData = (signal = []) =>
    signal.map((v, i) => ({ index: i, value: v }));

  const downsample = (arr, factor = 10) =>
    arr.filter((_, i) => i % factor === 0);

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
      await fetch(`http://localhost:8000/reset?doctor_id=${doctorId}&patient_id=${patientId}`, {
        method: "POST"
      });

      resetECGState();
      setCurrentFileName(selectedFile.name);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("seconds", seconds);
      formData.append("patientId", patientId);
      formData.append("doctorId", doctorId);

      setUploading(true);

      const response = await fetch(
        "http://localhost:8081/dataset/simulation/upload",
        {
          method: "POST",
          body: formData,
        }
      );

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

  useEffect(() => {
    if (!reportId) return;

    console.log("Connecting WS with reportId:", reportId);

    const ws = new WebSocket(
      `ws://localhost:8000/ws/${doctorId}/${patientId}`
    );

    ws.onopen = () => {
      console.log("✅ WebSocket CONNECTED");
    };

    ws.onerror = (err) => {
      console.error("❌ WebSocket ERROR:", err);
    };

    ws.onclose = (event) => {
      console.warn("⚠️ WebSocket CLOSED:", event);
    };

    let counter = 0;

    ws.onmessage = (event) => {
      console.log("📩 Message:", event.data);

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
          liveScrollRef.current.scrollLeft =
            liveScrollRef.current.scrollWidth;
        }
      }
      else if (msg.type === "WINDOW_RESULT") {
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

      {/* HEADER */}
      <h2 style={{ textAlign: "center", textTransform: "uppercase", letterSpacing: "2px" }}>
        ECG MONITOR SYSTEM
      </h2>

      {/* UPLOAD SECTION */}
      <div style={{
        marginBottom: "30px",
        padding: "25px",
        border: "2px solid #0f0",
        borderRadius: "12px",
        backgroundColor: "#111"
      }}>
        <h3 style={{ marginTop: 0, borderBottom: "1px solid #0f0", paddingBottom: "10px" }}>
          ECG DATASET INGESTION
        </h3>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "flex-end" }}>

          {/* File Input */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ marginBottom: "5px", fontSize: "12px" }}>SELECT .NPY FILE:</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".npy"
              onChange={handleFileChange}
              disabled={uploading}
              style={{ color: "#0f0" }}
            />
          </div>

          {/* Patient ID Input */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ marginBottom: "5px", fontSize: "12px" }}>PATIENT ID:</label>
            <input
              type="text"
              placeholder="Enter Patient ID"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              style={{
                background: "#000",
                color: "#0f0",
                border: "1px solid #0f0",
                padding: "8px",
                width: "150px"
              }}
            />
          </div>

          {/* Doctor ID Input */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ marginBottom: "5px", fontSize: "12px" }}>DOCTOR ID:</label>
            <input
              type="text"
              placeholder="Enter Doctor ID"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              style={{
                background: "#000",
                color: "#0f0",
                border: "1px solid #0f0",
                padding: "8px",
                width: "150px"
              }}
            />
          </div>

          {/* Sample Count Input */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ marginBottom: "5px", fontSize: "12px" }}>SECONDS TO READ:</label>
            <input
              type="number"
              value={seconds}
              onChange={(e) => {
                const value = Number(e.target.value);
                setSeconds(Math.max(5, value));
              }}
              style={{
                background: "#000",
                color: "#0f0",
                border: "1px solid #0f0",
                padding: "8px",
                width: "120px"
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={uploading || !selectedFile}
            style={{
              padding: "10px 25px",
              backgroundColor: uploading || !selectedFile ? "#333" : "#0f0",
              color: uploading || !selectedFile ? "#888" : "#000",
              border: "none",
              borderRadius: "4px",
              fontWeight: "bold",
              cursor: uploading || !selectedFile ? "not-allowed" : "pointer",
              textTransform: "uppercase"
            }}
          >
            {uploading ? "Processing..." : "Upload"}
          </button>
        </div>

        {uploading && (
          <div style={{ marginTop: "15px", color: "yellow", fontSize: "14px" }}>
            SYSTEM BUSY: Parsing NPY and pushing to Kafka...
          </div>
        )}
      </div>

      {currentFileName && (
        <div style={{ marginBottom: "20px", color: "#0f0", fontSize: "13px" }}>
          CURRENT DATASET: <strong>{currentFileName}</strong> {reportId && `| REPORT ID: ${reportId}`}
        </div>
      )}

      {/* LIVE ECG COMPONENT */}
      <h3 style={{ marginTop: 0, borderBottom: "1px solid #0f0", paddingBottom: "10px" }}>
        Live ECG Wave
      </h3>
      <div
        ref={liveScrollRef}
        style={{
          overflowX: "auto",
          whiteSpace: "nowrap",
          background: "#000",
          border: "2px solid #0f0",
          padding: "10px",
          marginBottom: "20px",
          height: "220px",
          scrollbarWidth: "thin",
          scrollbarColor: "#0f0 #000"
        }}
      >
        <div style={{
          width: `${liveData.length * 6}px`,
          height: "100%",
          minWidth: "100%"
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={liveData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="#00ff00"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
              <YAxis domain={['auto', 'auto']} hide />
              <XAxis dataKey="index" hide />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* WINDOW HISTORY STRIP */}
      <h3 style={{ marginTop: 0, borderBottom: "1px solid #0f0", paddingBottom: "10px" }}>
        Detecting ECG Segments of each 5 seconds window
      </h3>
      <div style={monitorStyles.scrollWrapper} ref={scrollRef}>
        {windows.map((w) => {
          const label = w.label || w.prediction;
          const isAF = label === "AF";
          const isSelected = selectedId === w.window_id;
          const signal = w.ecg_signal || w.ecg || [];

          return (
            <div
              key={w.window_id}
              onClick={() => fetchWindowDetails(w.window_id)}
              style={{
                ...monitorStyles.segmentBlock,
                backgroundColor: isSelected ? "rgba(0, 255, 0, 0.2)" : isAF ? "rgba(255, 0, 0, 0.1)" : "transparent",
                border: isSelected ? "2px solid #0f0" : "1px solid #333",
              }}
            >
              <div style={{ fontSize: "12px" }}>ID: {w.window_id}</div>
              <LineChart width={300} height={80} data={formatData(downsample(signal, 5))}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={isAF ? "#ff4444" : "#00ff00"}
                  dot={false}
                  strokeWidth={1}
                  isAnimationActive={false}
                />
              </LineChart>
              <div style={{ fontWeight: "bold", color: isAF ? "#ff4444" : "#0f0" }}>{label}</div>
            </div>
          );
        })}
      </div>

      {/* DETAIL VIEW PANEL */}
      {selectedWindow && !loadingDetail && (
        <div style={{ marginTop: "20px" }}>
          <h3 style={{ marginTop: 0, borderBottom: "1px solid #0f0", paddingBottom: "10px" }}>
            Detailed selected 5sec window
          </h3>
          <div style={monitorStyles.detailPanel}>
            <h3>WINDOW #{selectedWindow.window_id} - Full View</h3>
            <div style={{ height: "250px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formatData(selectedWindow.ecg_signal || selectedWindow.ecg || [])}>
                  <YAxis domain={['auto', 'auto']} stroke="#0f0" />
                  <Tooltip contentStyle={{ backgroundColor: '#000' }} />
                  <Line type="monotone" dataKey="value" stroke="#00ff00" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <button
              onClick={() => setSelectedWindow(null)}
              style={{
                color: 'red',
                marginTop: '10px',
                cursor: 'pointer',
                background: 'none',
                border: '1px solid red',
                padding: '5px 10px'
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;