import React, { useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid
} from "recharts";

const AFSegmentsViewer = () => {
    const [doctorId, setDoctorId] = useState("");
    const [patientId, setPatientId] = useState("");
    const [segments, setSegments] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchAFSegments = () => {
        if (!doctorId || !patientId) {
            alert("Please enter doctorId and patientId");
            return;
        }

        setLoading(true);

        fetch(`http://localhost:8000/af-segments-agg?doctor_id=${doctorId}&patient_id=${patientId}`)
            .then(res => res.json())
            .then(data => {
                setSegments(data.af_segments || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching AF segments:", err);
                setLoading(false);
            });
    };

    const formatECG = (ecg) => {
        return ecg.map((val, index) => ({
            index,
            value: val
        }));
    };

    return (
        <div style={{ padding: "20px" }}>
            <h2>AF ECG Segments Viewer</h2>

            {/* 🔹 Input Fields */}
            <div style={{ marginBottom: "15px" }}>
                <input
                    type="text"
                    placeholder="Doctor ID"
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    style={{ marginRight: "10px", padding: "5px" }}
                />

                <input
                    type="text"
                    placeholder="Patient ID"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    style={{ marginRight: "10px", padding: "5px" }}
                />

                {/* 🔥 Button */}
                <button onClick={fetchAFSegments} style={{ padding: "6px 12px" }}>
                    Load AF Segments
                </button>
            </div>

            {/* 🔄 Loading */}
            {loading && <p>Loading...</p>}

            {/* 📊 Results */}
            <h3>Total AF Segments: {segments.length}</h3>

            {segments.map((seg, i) => (
                <div
                    key={i}
                    style={{
                        border: "1px solid #ccc",
                        borderRadius: "10px",
                        padding: "15px",
                        marginBottom: "20px"
                    }}
                >
                    <p><strong>Window ID:</strong> {seg.window_id}</p>
                    <p><strong>Probability:</strong> {(seg.prob_af * 100).toFixed(2)}%</p>
                    <p><strong>Start:</strong> {seg.start_time}</p>
                    <p><strong>End:</strong> {seg.end_time}</p>

                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={formatECG(seg.ecg_signal)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="index" hide />
                            <YAxis domain={["auto", "auto"]} />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" dot={false} strokeWidth={1} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ))}
        </div>
    );
};

export default AFSegmentsViewer;