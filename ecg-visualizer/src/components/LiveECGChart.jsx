import React from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";

function LiveECGChart({ liveScrollRef, liveData }) {
    return (
        <React.Fragment>
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
        </React.Fragment>
    );
}

export default LiveECGChart;