import React from "react";
import { LineChart, Line } from "recharts";
import { monitorStyles } from "../styles/monitorStyles";
import { formatData, downsample } from "../utils/dataHelpers";

function WindowHistoryStrip({ windows, selectedId, fetchWindowDetails, scrollRef }) {
    return (
        <div style={styles.card}>
            <div style={styles.cardHeader}>
                <div>
                    <div style={styles.sectionTag}>Analysis</div>
                    <h3 style={styles.cardTitle}>ECG Segment History</h3>
                </div>
                <div style={styles.count}>{windows.length} windows</div>
            </div>

            {windows.length === 0 ? (
                <div style={styles.emptyState}>
                    <span>No segments detected yet. Upload a dataset to begin.</span>
                </div>
            ) : (
                <div style={monitorStyles.scrollWrapper} ref={scrollRef}>
                    {windows.map((w) => {
                        const label = w.label || w.prediction;
                        const isAF = label === "AF";
                        const isSelected = selectedId === w.window_id;
                        const signal = w.ecg_signal || w.ecg || [];

                        return (
                            <div key={w.window_id} onClick={() => fetchWindowDetails(w.window_id)}
                                style={{
                                    ...monitorStyles.segmentBlock,
                                    background: isSelected
                                        ? "rgba(212,168,67,0.08)"
                                        : isAF ? "rgba(224,92,106,0.06)" : "rgba(255,255,255,0.02)",
                                    border: isSelected
                                        ? "1px solid rgba(212,168,67,0.5)"
                                        : isAF ? "1px solid rgba(224,92,106,0.3)" : "1px solid rgba(255,255,255,0.06)",
                                    boxShadow: isSelected ? "0 0 20px rgba(212,168,67,0.1)" : "none",
                                    cursor: "pointer",
                                }}>
                                <div style={{ fontSize: 10, color: "#5a5870", letterSpacing: "0.08em",
                                    textTransform: "uppercase", marginBottom: 6 }}>
                                    Window #{w.window_id}
                                </div>

                                <LineChart width={240} height={70} data={formatData(downsample(signal, 5))}>
                                    <Line type="monotone" dataKey="value"
                                        stroke={isAF ? "#e05c6a" : "#4ecdc4"}
                                        dot={false} strokeWidth={1.5} isAnimationActive={false} />
                                </LineChart>

                                <div style={{
                                    marginTop: 8, padding: "3px 10px", borderRadius: 12,
                                    fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
                                    background: isAF ? "rgba(224,92,106,0.15)" : "rgba(78,205,196,0.12)",
                                    color: isAF ? "#e05c6a" : "#4ecdc4",
                                    border: `1px solid ${isAF ? "rgba(224,92,106,0.3)" : "rgba(78,205,196,0.25)"}`,
                                }}>
                                    {label}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const styles = {
    card: {
        background: "linear-gradient(135deg, rgba(7,13,26,0.9) 0%, rgba(12,22,40,0.95) 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16, padding: "24px 28px", marginBottom: 24,
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
    },
    cardHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
    sectionTag: {
        fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
        color: "#d4a843", marginBottom: 4, fontWeight: 500,
    },
    cardTitle: { fontSize: 18, fontFamily: "'Playfair Display', serif", color: "#f0eeea" },
    count: {
        fontSize: 12, color: "#5a5870", padding: "5px 10px",
        background: "rgba(255,255,255,0.03)", borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.05)",
    },
    emptyState: {
        textAlign: "center", padding: "40px 20px",
        color: "#5a5870", fontSize: 13, fontStyle: "italic",
    },
};

export default WindowHistoryStrip;
