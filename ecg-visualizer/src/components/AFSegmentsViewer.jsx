import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const AFSegmentsViewer = () => {
    const [doctorId, setDoctorId] = useState("");
    const [patientId, setPatientId] = useState("");
    const [segments, setSegments] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchAFSegments = () => {
        if (!doctorId || !patientId) { alert("Please enter Doctor ID and Patient ID"); return; }
        setLoading(true);
        fetch(`http://localhost:8000/af-segments-agg?doctor_id=${doctorId}&patient_id=${patientId}`)
            .then(res => res.json())
            .then(data => { setSegments(data.af_segments || []); setLoading(false); })
            .catch(err => { console.error("Error fetching AF segments:", err); setLoading(false); });
    };

    const formatECG = (ecg) => ecg.map((val, index) => ({ index, value: val }));

    return (
        <div>
            <div style={styles.pageHeader}>
                <div style={styles.sectionTag}>Arrhythmia</div>
                <h2 style={styles.pageTitle}>AF Segment Library</h2>
                <p style={styles.pageDesc}>Review all detected atrial fibrillation episodes for a patient session.</p>
            </div>

            <div style={styles.queryCard}>
                <div style={styles.queryRow}>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Physician ID</label>
                        <input type="text" placeholder="e.g. DR-00089" value={doctorId}
                            onChange={(e) => setDoctorId(e.target.value)} style={styles.input} />
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Patient ID</label>
                        <input type="text" placeholder="e.g. PT-00142" value={patientId}
                            onChange={(e) => setPatientId(e.target.value)} style={styles.input} />
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <button onClick={fetchAFSegments} disabled={loading} style={styles.loadBtn}>
                            {loading ? "Loading…" : "Fetch Segments"}
                        </button>
                    </div>
                </div>
            </div>

            {loading && (
                <div style={styles.loadingState}>
                    <div style={styles.loadingDots}>
                        <span/><span/><span/>
                    </div>
                    <span>Retrieving AF segments…</span>
                </div>
            )}

            {!loading && segments.length > 0 && (
                <div>
                    <div style={styles.resultsHeader}>
                        <span style={styles.resultsCount}>{segments.length}</span>
                        <span style={{ color: "#5a5870", fontSize: 13 }}> AF episodes detected</span>
                    </div>
                    <div style={styles.segmentGrid}>
                        {segments.map((seg, i) => (
                            <div key={i} style={styles.segCard}>
                                <div style={styles.segCardHeader}>
                                    <div>
                                        <div style={styles.segId}>Window #{seg.window_id}</div>
                                        <div style={styles.timeRange}>{seg.start_time} → {seg.end_time}</div>
                                    </div>
                                    <div style={styles.probBadge}>
                                        <span style={styles.probValue}>{(seg.prob_af * 100).toFixed(1)}%</span>
                                        <span style={styles.probLabel}>AF prob.</span>
                                    </div>
                                </div>

                                <div style={styles.segChartArea}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={formatECG(seg.ecg_signal)}
                                            margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                            <XAxis dataKey="index" hide />
                                            <YAxis domain={["auto", "auto"]} hide />
                                            <Tooltip
                                                contentStyle={{ background: "rgba(4,7,15,0.95)",
                                                    border: "1px solid rgba(224,92,106,0.25)", borderRadius: 8,
                                                    color: "#f0eeea", fontSize: 11 }}
                                            />
                                            <Line type="monotone" dataKey="value" stroke="#e05c6a"
                                                dot={false} strokeWidth={1.5} isAnimationActive={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!loading && segments.length === 0 && patientId && (
                <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>♡</div>
                    <div style={{ color: "#5a5870", fontSize: 13 }}>No AF segments found for this patient.</div>
                </div>
            )}
        </div>
    );
};

const styles = {
    pageHeader: { marginBottom: 32 },
    sectionTag: { fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#e05c6a", marginBottom: 6, fontWeight: 500 },
    pageTitle: { fontSize: 28, fontFamily: "'Playfair Display', serif", color: "#f0eeea", marginBottom: 8 },
    pageDesc: { fontSize: 13, color: "#5a5870", margin: 0 },
    queryCard: {
        background: "linear-gradient(135deg, rgba(7,13,26,0.9), rgba(12,22,40,0.95))",
        border: "1px solid rgba(224,92,106,0.15)", borderRadius: 14, padding: "20px 24px", marginBottom: 28,
    },
    queryRow: { display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" },
    fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a5870", fontWeight: 500 },
    input: {
        background: "rgba(255,255,255,0.04)", color: "#f0eeea",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
        padding: "10px 14px", fontSize: 13, outline: "none",
        fontFamily: "'DM Sans', sans-serif", width: 170,
    },
    loadBtn: {
        background: "linear-gradient(135deg, rgba(224,92,106,0.2), rgba(224,92,106,0.1))",
        border: "1px solid rgba(224,92,106,0.4)", color: "#e05c6a",
        padding: "11px 20px", borderRadius: 8, cursor: "pointer",
        fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
    },
    loadingState: { display: "flex", alignItems: "center", gap: 12, padding: "32px", color: "#5a5870", fontSize: 13, justifyContent: "center" },
    loadingDots: { display: "flex", gap: 4 },
    resultsHeader: { marginBottom: 20 },
    resultsCount: { fontSize: 28, fontFamily: "'Playfair Display', serif", color: "#e05c6a" },
    segmentGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 },
    segCard: {
        background: "linear-gradient(135deg, rgba(7,13,26,0.9), rgba(12,22,40,0.95))",
        border: "1px solid rgba(224,92,106,0.18)", borderRadius: 14, padding: "20px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    },
    segCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
    segId: { fontSize: 14, fontWeight: 500, color: "#f0eeea", fontFamily: "'JetBrains Mono', monospace" },
    timeRange: { fontSize: 11, color: "#5a5870", marginTop: 4, fontFamily: "'JetBrains Mono', monospace" },
    probBadge: { textAlign: "right" },
    probValue: { display: "block", fontSize: 22, fontFamily: "'Playfair Display', serif", color: "#e05c6a" },
    probLabel: { fontSize: 10, color: "#5a5870", textTransform: "uppercase", letterSpacing: "0.08em" },
    segChartArea: { height: 150 },
    emptyState: { textAlign: "center", padding: "60px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
    emptyIcon: { fontSize: 32, color: "#5a5870" },
};

export default AFSegmentsViewer;
