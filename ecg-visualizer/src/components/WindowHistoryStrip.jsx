import React from "react";
import { LineChart, Line } from "recharts";
import { monitorStyles } from "../styles/monitorStyles";
import { formatData, downsample } from "../utils/dataHelpers";

function WindowHistoryStrip({ windows, selectedId, fetchWindowDetails, scrollRef }) {
    return (
        <React.Fragment>
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
        </React.Fragment>
    );
}

export default WindowHistoryStrip;