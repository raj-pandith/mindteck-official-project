import React from "react";
import { LineChart, Line, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { monitorStyles } from "../styles/monitorStyles";
import { formatData } from "../utils/dataHelpers";

function WindowDetailPanel({ selectedWindow, loadingDetail, setSelectedWindow }) {
    if (!selectedWindow || loadingDetail) return null;

    return (
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
    );
}

export default WindowDetailPanel;