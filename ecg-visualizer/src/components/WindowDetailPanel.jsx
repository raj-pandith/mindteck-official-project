import React from "react";
import { LineChart, Line, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatData } from "../utils/dataHelpers";

function WindowDetailPanel({ selectedWindow, loadingDetail, setSelectedWindow }) {
    if (!selectedWindow || loadingDetail) return null;

    const label = selectedWindow.label || selectedWindow.prediction;
    const isAF = label === "AF";

    return (
        <div style={styles.overlay}>
            <div style={styles.panel}>
                <div style={styles.panelHeader}>
                    <div>
                        <div style={styles.sectionTag}>Detail View</div>
                        <h3 style={styles.panelTitle}>Window #{selectedWindow.window_id}</h3>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                            padding: "5px 14px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                            background: isAF ? "rgba(224,92,106,0.15)" : "rgba(78,205,196,0.12)",
                            color: isAF ? "#e05c6a" : "#4ecdc4",
                            border: `1px solid ${isAF ? "rgba(224,92,106,0.3)" : "rgba(78,205,196,0.25)"}`,
                            letterSpacing: "0.06em",
                        }}>
                            {label}
                        </div>
                        <button onClick={() => setSelectedWindow(null)} style={styles.closeBtn}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                            Close
                        </button>
                    </div>
                </div>

                <div style={styles.chartArea}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formatData(selectedWindow.ecg_signal || selectedWindow.ecg || [])}
                            margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                            <defs>
                                <linearGradient id="detailLine" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={isAF ? "#e05c6a" : "#4ecdc4"} stopOpacity={0.7} />
                                    <stop offset="100%" stopColor={isAF ? "#e05c6a" : "#4ecdc4"} stopOpacity={1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
                            <YAxis domain={['auto', 'auto']} stroke="#5a5870" tick={{ fontSize: 10, fill: "#5a5870" }} />
                            <Tooltip
                                contentStyle={{ background: "rgba(4,7,15,0.95)", border: "1px solid rgba(212,168,67,0.2)",
                                    borderRadius: 8, color: "#f0eeea", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}
                                itemStyle={{ color: isAF ? "#e05c6a" : "#4ecdc4" }}
                            />
                            <Line type="monotone" dataKey="value" stroke={`url(#detailLine)`}
                                dot={false} strokeWidth={1.5} isAnimationActive={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: { marginTop: 24, marginBottom: 24 },
    panel: {
        background: "linear-gradient(135deg, rgba(4,7,15,0.98) 0%, rgba(12,22,40,0.98) 100%)",
        border: "1px solid rgba(212,168,67,0.2)",
        borderRadius: 16, padding: "24px 28px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(212,168,67,0.05)",
        animation: "fade-in-up 0.25s ease",
    },
    panelHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
    sectionTag: {
        fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
        color: "#d4a843", marginBottom: 4, fontWeight: 500,
    },
    panelTitle: { fontSize: 20, fontFamily: "'Playfair Display', serif", color: "#f0eeea" },
    closeBtn: {
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 14px", background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
        color: "#a8a4b8", fontSize: 12, cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
    },
    chartArea: { height: 260 },
};

export default WindowDetailPanel;
