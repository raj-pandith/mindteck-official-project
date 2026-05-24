import React, { useEffect, useRef, useState } from "react";
import DataIngestionForm from "./components/DataIngestionForm";
import LiveECGChart from "./components/LiveECGChart";
import WindowHistoryStrip from "./components/WindowHistoryStrip";
import WindowDetailPanel from "./components/WindowDetailPanel";
import AFSegmentsViewer from "./components/AFSegmentsViewer";
import ReportDownloader from "./components/ReportDownloader";

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
  const [af_count, setAfCount] = useState(0);
  const [normal_count, setNormalCount] = useState(0);
  const [activeTab, setActiveTab] = useState("monitor");

  const scrollRef = useRef(null);
  const liveScrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: "smooth" });
    }
  }, [windows]);

  const handleFileChange = (event) => setSelectedFile(event.target.files[0]);

  const resetECGState = () => {
    setLiveData([]); setWindows([]); setSelectedWindow(null);
    setSelectedId(null); setTotalSamples(0);
  };

  const handleSubmit = async () => {
    if (!selectedFile || !patientId || !doctorId) {
      alert("File, Patient ID and Doctor ID are required"); return;
    }
    try {
      await fetch(`http://localhost:8000/reset?doctor_id=${doctorId}&patient_id=${patientId}`, { method: "POST" });
      resetECGState();
      setCurrentFileName(selectedFile.name);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("seconds", seconds);
      formData.append("patientId", patientId);
      formData.append("doctorId", doctorId);
      setUploading(true);
      const response = await fetch("http://localhost:8081/dataset/simulation/upload", { method: "POST", body: formData });
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
      console.error("Upload error:", err); alert("Server connection error.");
    } finally {
      setUploading(false);
    }
  };

  const fetchWindowDetails = async (windowId) => {
    setSelectedId(windowId); setLoadingDetail(true);
    try {
      const res = await fetch(`http://localhost:8000/window/${patientId}/${windowId}`);
      const data = await res.json();
      setSelectedWindow(data);
    } catch (err) { console.error("Error fetching window:", err); }
    finally { setLoadingDetail(false); }
  };

  useEffect(() => {
    if (!reportId) return;
    const ws = new WebSocket(`ws://localhost:8000/ws/${doctorId}/${patientId}`);
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
        if (liveScrollRef.current) liveScrollRef.current.scrollLeft = liveScrollRef.current.scrollWidth;
      } else if (msg.type === "WINDOW_RESULT") {
        setWindows((prev) => {
          const exists = prev.find((w) => w.window_id === msg.window_id);
          if (exists) return prev;
          return [...prev, msg];
        });
        setAfCount(msg.af_count);
        setNormalCount(msg.normal_count);
      }
    };
    return () => ws.close();
  }, [reportId]);

  const afRate = (af_count + normal_count) > 0
    ? Math.round((af_count / (af_count + normal_count)) * 100) : 0;

  return (
    <div style={appStyles.root}>
      {/* Background layers */}
      <div style={appStyles.bgGradient} />
      <div style={appStyles.bgGrid} />

      {/* Header */}
      <header style={appStyles.header}>
        <div style={appStyles.headerInner}>
          <div style={appStyles.logoArea}>
            <div style={appStyles.logoIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M3 12h3l3-9 4 18 3-9h5" stroke="#d4a843" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div style={appStyles.logoTitle}>CardioLens</div>
              <div style={appStyles.logoSub}>ECG Intelligence Platform</div>
            </div>
          </div>

          {/* Live stats */}
          <div style={appStyles.statsRow}>
            <StatPill label="Total Samples" value={totalSamples.toLocaleString()} color="#d4a843" />
            <StatPill label="AF Episodes" value={af_count} color="#e05c6a" />
            <StatPill label="Normal" value={normal_count} color="#4ecdc4" />
            <StatPill label="AF Rate" value={`${afRate}%`} color={afRate > 30 ? "#e05c6a" : "#4ecdc4"} />
          </div>

          {/* Status badge */}
          <div style={{ ...appStyles.statusBadge, ...(reportId ? appStyles.statusLive : appStyles.statusIdle) }}>
            <span style={{ ...appStyles.statusDot, background: reportId ? "#4ecdc4" : "#5a5870",
              boxShadow: reportId ? "0 0 8px #4ecdc4" : "none",
              animation: reportId ? "pulse-glow 2s ease-in-out infinite" : "none" }} />
            {reportId ? "Streaming" : "Standby"}
          </div>
        </div>
      </header>

      {/* Nav Tabs */}
      <nav style={appStyles.nav}>
        {["monitor", "af-segments", "reports"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ ...appStyles.navTab, ...(activeTab === tab ? appStyles.navTabActive : {}) }}>
            {tab === "monitor" && "Monitor"}
            {tab === "af-segments" && "AF Segments"}
            {tab === "reports" && "Reports"}
          </button>
        ))}
        {currentFileName && (
          <div style={appStyles.fileTag}>
            <span style={{ color: "#d4a843", marginRight: 6 }}>▶</span>
            {currentFileName}
            {reportId && <span style={{ color: "#5a5870", marginLeft: 8 }}>#{reportId.slice(0,8)}</span>}
          </div>
        )}
      </nav>

      {/* Main content */}
      <main style={appStyles.main}>
        {activeTab === "monitor" && (
          <div style={{ animation: "fade-in-up 0.3s ease" }}>
            <DataIngestionForm
              fileInputRef={fileInputRef} handleFileChange={handleFileChange}
              uploading={uploading} patientId={patientId} setPatientId={setPatientId}
              doctorId={doctorId} setDoctorId={setDoctorId} seconds={seconds}
              setSeconds={setSeconds} handleSubmit={handleSubmit} selectedFile={selectedFile}
            />
            <LiveECGChart liveScrollRef={liveScrollRef} liveData={liveData} />
            <WindowHistoryStrip windows={windows} selectedId={selectedId}
              fetchWindowDetails={fetchWindowDetails} scrollRef={scrollRef} />
            <WindowDetailPanel selectedWindow={selectedWindow}
              loadingDetail={loadingDetail} setSelectedWindow={setSelectedWindow} />
          </div>
        )}
        {activeTab === "af-segments" && (
          <div style={{ animation: "fade-in-up 0.3s ease" }}>
            <AFSegmentsViewer />
          </div>
        )}
        {activeTab === "reports" && (
          <div style={{ animation: "fade-in-up 0.3s ease" }}>
            <ReportDownloader />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={appStyles.footer}>
        <span>CardioLens ECG Platform</span>
        <span style={{ color: "#5a5870" }}>·</span>
        {patientId && <span>Patient <strong style={{ color: "#d4a843" }}>{patientId}</strong></span>}
        {doctorId && <span>Physician <strong style={{ color: "#d4a843" }}>{doctorId}</strong></span>}
      </footer>
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ textAlign: "center", padding: "8px 16px", background: "rgba(255,255,255,0.03)",
      borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: 11, color: "#5a5870", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 500, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    </div>
  );
}

const appStyles = {
  root: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
  },
  bgGradient: {
    position: "fixed", inset: 0, zIndex: 0,
    background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(21,40,80,0.7) 0%, #04070f 60%)",
    pointerEvents: "none",
  },
  bgGrid: {
    position: "fixed", inset: 0, zIndex: 0,
    backgroundImage: "linear-gradient(rgba(212,168,67,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,67,0.03) 1px, transparent 1px)",
    backgroundSize: "60px 60px",
    pointerEvents: "none",
  },
  header: {
    position: "relative", zIndex: 10,
    borderBottom: "1px solid rgba(212,168,67,0.12)",
    background: "rgba(4,7,15,0.8)",
    backdropFilter: "blur(20px)",
  },
  headerInner: {
    maxWidth: 1400, margin: "0 auto", padding: "16px 32px",
    display: "flex", alignItems: "center", gap: 24,
  },
  logoArea: { display: "flex", alignItems: "center", gap: 12, marginRight: "auto" },
  logoIcon: {
    width: 42, height: 42, borderRadius: 10,
    background: "linear-gradient(135deg, rgba(212,168,67,0.15), rgba(212,168,67,0.05))",
    border: "1px solid rgba(212,168,67,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  logoTitle: {
    fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 500,
    color: "#f0eeea", letterSpacing: "0.02em",
  },
  logoSub: { fontSize: 11, color: "#5a5870", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 1 },
  statsRow: { display: "flex", gap: 10 },
  statusBadge: {
    display: "flex", alignItems: "center", gap: 7, padding: "7px 14px",
    borderRadius: 20, fontSize: 12, fontWeight: 500, letterSpacing: "0.05em",
  },
  statusLive: { background: "rgba(78,205,196,0.1)", border: "1px solid rgba(78,205,196,0.3)", color: "#4ecdc4" },
  statusIdle: { background: "rgba(90,88,112,0.1)", border: "1px solid rgba(90,88,112,0.2)", color: "#5a5870" },
  statusDot: { width: 7, height: 7, borderRadius: "50%" },
  nav: {
    position: "relative", zIndex: 10,
    maxWidth: 1400, margin: "0 auto", padding: "0 32px",
    display: "flex", alignItems: "center", gap: 4,
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  navTab: {
    padding: "14px 20px", background: "none", border: "none",
    color: "#5a5870", fontSize: 13, fontWeight: 500, cursor: "pointer",
    letterSpacing: "0.04em", borderBottom: "2px solid transparent",
    transition: "all 0.2s ease", fontFamily: "'DM Sans', sans-serif",
    textTransform: "capitalize",
  },
  navTabActive: { color: "#d4a843", borderBottom: "2px solid #d4a843" },
  fileTag: {
    marginLeft: "auto", fontSize: 12, color: "#a8a4b8",
    padding: "6px 12px", background: "rgba(255,255,255,0.03)",
    borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)",
    fontFamily: "'JetBrains Mono', monospace",
  },
  main: { position: "relative", zIndex: 10, maxWidth: 1400, margin: "0 auto", padding: "32px 32px" },
  footer: {
    position: "relative", zIndex: 10,
    maxWidth: 1400, margin: "0 auto", padding: "16px 32px",
    borderTop: "1px solid rgba(255,255,255,0.04)",
    display: "flex", gap: 20, alignItems: "center",
    fontSize: 12, color: "#5a5870", fontFamily: "'DM Sans', sans-serif",
  },
};

export default App;
