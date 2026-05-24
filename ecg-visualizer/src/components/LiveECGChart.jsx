import React from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";

function LiveECGChart({ liveScrollRef, liveData }) {
    return (
        <div style={styles.card}>
            <div style={styles.cardHeader}>
                <div>
                    <div style={styles.sectionTag}>Real-time</div>
                    <h3 style={styles.cardTitle}>Live ECG Waveform</h3>
                </div>
                <div style={styles.liveBadge}>
                    <span style={styles.liveDot} />
                    Live
                </div>
            </div>

            <div ref={liveScrollRef} style={styles.chartWrapper}>
                <div style={{ width: `${Math.max(liveData.length * 5, 100)}px`, height: "100%", minWidth: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={liveData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                            <defs>
                                <linearGradient id="ecgGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#4ecdc4" stopOpacity={0.6} />
                                    <stop offset="50%" stopColor="#4ecdc4" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#4ecdc4" stopOpacity={0.6} />
                                </linearGradient>
                            </defs>
                            <Line type="monotone" dataKey="value"
                                stroke="url(#ecgGlow)" dot={false} strokeWidth={1.5}
                                isAnimationActive={false} />
                            <YAxis domain={['auto', 'auto']} hide />
                            <XAxis dataKey="index" hide />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {liveData.length === 0 && (
                    <div style={styles.emptyState}>
                        <div style={styles.flatline} />
                        <span style={{ fontSize: 12, color: "#5a5870", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                            Awaiting signal…
                        </span>
                    </div>
                )}
            </div>

            {/* Grid reference lines overlay */}
            <div style={styles.gridOverlay} />
        </div>
    );
}

const styles = {
    card: {
        background: "linear-gradient(135deg, rgba(4,7,15,0.95) 0%, rgba(7,13,26,0.98) 100%)",
        border: "1px solid rgba(78,205,196,0.15)",
        borderRadius: 16, padding: "24px 28px", marginBottom: 24,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(78,205,196,0.04)",
        position: "relative", overflow: "hidden",
    },
    cardHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
    sectionTag: {
        fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
        color: "#4ecdc4", marginBottom: 4, fontWeight: 500,
    },
    cardTitle: { fontSize: 18, fontFamily: "'Playfair Display', serif", color: "#f0eeea" },
    liveBadge: {
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500,
        background: "rgba(78,205,196,0.1)", border: "1px solid rgba(78,205,196,0.25)", color: "#4ecdc4",
        letterSpacing: "0.06em",
    },
    liveDot: {
        width: 6, height: 6, borderRadius: "50%", background: "#4ecdc4",
        boxShadow: "0 0 8px #4ecdc4", animation: "pulse-glow 1.5s ease-in-out infinite",
    },
    chartWrapper: {
        height: 200, overflowX: "auto", overflowY: "hidden",
        background: "rgba(0,0,0,0.3)", borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.04)",
        position: "relative",
        scrollbarWidth: "thin", scrollbarColor: "rgba(78,205,196,0.2) transparent",
    },
    emptyState: {
        position: "absolute", inset: 0, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
    },
    flatline: {
        width: "60%", height: 1,
        background: "linear-gradient(90deg, transparent, rgba(78,205,196,0.3), transparent)",
    },
    gridOverlay: {
        position: "absolute", inset: "68px 28px 28px 28px", pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(78,205,196,0.03) 1px, transparent 1px)",
        backgroundSize: "100% 40px", borderRadius: 10,
    },
};

export default LiveECGChart;
