import axios from "axios";
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

  const [selectedFile, setSelectedFile] = useState(null); // New state for file
  const [seconds, setSeconds] = useState(5);
  const [uploading, setUploading] = useState(false);
  const [totalSamples, setTotalSamples] = useState(0);
  const [windows, setWindows] = useState([]);
  const [selectedWindow, setSelectedWindow] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [liveData, setLiveData] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [currentFileName, setCurrentFileName] = useState("");

  const scrollRef = useRef(null);
  const liveScrollRef = useRef(null); // Ref for the scrollable container
  const selectedRef = useRef(null);
  const fileInputRef = useRef(null);

  const formatData = (signal = []) =>
    signal.map((v, i) => ({ index: i, value: v }));

  const downsample = (arr, factor = 10) =>
    arr.filter((_, i) => i % factor === 0);

  // useEffect(() => {
  //   fetch("http://localhost:8000/windows")
  //     .then((res) => res.json())
  //     .then((data) => setWindows(data))
  //     .catch((err) => console.error("Fetch error:", err));
  // }, []);

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
    if (!selectedFile) {
      alert("Please select a .npy file first.");
      return;
    }

    try {

      await fetch("http://localhost:8000/reset", {
        method: "POST",
      });

      resetECGState();
      setCurrentFileName(selectedFile.name);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("seconds", seconds);

      setUploading(true);

      // 3️⃣ UPLOAD FILE
      const response = await fetch(
        "http://localhost:8081/dataset/simulation/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        setSelectedFile(null);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
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

  // WebSocket Logic with Auto-Scrolling
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws");
    let counter = 0;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "LIVE_SAMPLE") {
        counter++;
        setTotalSamples(prev => prev + 1);
        // Adjust the modulo to control how many points you skip for performance
        if (counter % 2 !== 0) return;

        setLiveData((prev) => {
          const updated = [...prev, { index: prev.length, value: msg.value }];
          // Increase 2000 to keep more history in the scrollable view
          return updated.length > 3000 ? updated.slice(-3000) : updated;
        });

        //  AUTO-SCROLL TO RIGHT: Keep the latest wave visible
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

    return () => ws.close();
  }, []);

  return (
    <div style={{ padding: "20px", backgroundColor: "#0a0a0a", minHeight: "100vh", color: "#0f0" }}>
      <h2 style={{ textAlign: "center", textTransform: "uppercase", letterSpacing: "2px" }}>
        ECG Monitor
      </h2>

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

          {/* Sample Count Input */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ marginBottom: "5px", fontSize: "12px" }}>in SECONDS TO READ:</label>
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
            {uploading ? "Processing..." : "Submit"}
          </button>
        </div>

        {uploading && (
          <div style={{ marginTop: "15px", color: "yellow", fontSize: "14px" }}>
            SYSTEM BUSY: Parsing NPY and pushing to Kafka...
          </div>
        )}
      </div>
      {currentFileName && (
        <div style={{
          marginTop: "10px",
          color: "#0f0",
          fontSize: "13px"
        }}>
          CURRENT DATASET: <strong>{currentFileName}</strong>
        </div>
      )}

      <h3 style={{ marginTop: 0, borderBottom: "1px solid #0f0", paddingBottom: "10px" }}>
        Live ECG Wave
      </h3>
      {/*  HORIZONTAL SCROLLING LIVE ECG */}
      <div
        ref={liveScrollRef}
        style={{
          overflowX: "auto",      // Enable horizontal scrolling
          whiteSpace: "nowrap",
          background: "#000",
          border: "2px solid #0f0",
          padding: "10px",
          marginBottom: "20px",
          height: "220px",
          scrollbarWidth: "thin",   // For Firefox
          scrollbarColor: "#0f0 #000"
        }}
      >
        {/* The inner div width is calculated by the number of samples */}
        <div style={{
          width: `${liveData.length * 6}px`, // 6px per sample creates the horizontal length
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
                isAnimationActive={false} // Disable animation for smooth real-time scrolling
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
                <Line type="monotone" dataKey="value" stroke={isAF ? "#ff4444" : "#00ff00"} dot={false} strokeWidth={1} isAnimationActive={false} />
              </LineChart>
              <div style={{ fontWeight: "bold", color: isAF ? "#ff4444" : "#0f0" }}>{label}</div>
            </div>
          );
        })}
      </div>

      {/* DETAIL VIEW PANEL */}
      <h3 style={{ marginTop: 0, borderBottom: "1px solid #0f0", paddingBottom: "10px" }}>
        Detailed selected 5sec window
      </h3>
      {selectedWindow && !loadingDetail && (
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
          <button onClick={() => setSelectedWindow(null)} style={{ color: 'red', marginTop: '10px', cursor: 'pointer', background: 'none', border: '1px solid red' }}>CLOSE</button>
        </div>
      )}
    </div>
  );
}

export default App;