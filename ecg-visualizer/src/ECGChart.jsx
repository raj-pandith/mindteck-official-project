import React, { useEffect, useRef, useState } from "react";
import {
    Chart as ChartJS,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Legend,
    Tooltip,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { Line } from "react-chartjs-2";

// CRITICAL: You must register the plugin here
ChartJS.register(
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    annotationPlugin, // Add it here
    Legend,
    Tooltip
);

const ECGChart = () => {
    const [ecgData, setEcgData] = useState([]);
    const [windows, setWindows] = useState([]);

    const wsRef = useRef(null);
    const sampleRate = 360;

    const containerRef = useRef();

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollLeft = containerRef.current.scrollWidth;
        }
    }, [ecgData]);

    useEffect(() => {
        wsRef.current = new WebSocket("ws://127.0.0.1:8000/ws");

        wsRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);

            const newWindow = data.ecg; // 1800 samples
            const label = data.prediction;
            const confidence = data.confidence;

            setEcgData((prev) => {
                const startIndex = prev.length;
                const updated = [...prev, ...newWindow];
                const endIndex = updated.length - 1;

                // store window metadata
                setWindows((prevWindows) => [
                    ...prevWindows,
                    {
                        start: startIndex,
                        end: endIndex,
                        label,
                        seq: prevWindows.length + 1,
                    },
                ]);

                return updated;
            });
        };

        return () => wsRef.current.close();
    }, []);

    // 🔥 Create annotations for each window
    const annotations = {};
    windows.forEach((w, i) => {
        annotations[`start-${i}`] = {
            type: "line",
            xMin: w.start,
            xMax: w.start,
            borderColor: "green",
            borderWidth: 2,
        };

        annotations[`end-${i}`] = {
            type: "line",
            xMin: w.end,
            xMax: w.end,
            borderColor: "red",
            borderWidth: 2,
        };

        annotations[`label-${i}`] = {
            type: "label",
            xValue: (w.start + w.end) / 2,
            yValue: 1,
            content: [`#${w.seq}`, w.label],
            backgroundColor: w.label === "AF" ? "red" : "green",
            color: "white",
            font: {
                size: 10,
            },
        };
    });

    const data = {
        labels: ecgData.map((_, i) => i),
        datasets: [
            {
                label: "ECG Signal",
                data: ecgData,
                borderColor: "cyan",
                borderWidth: 1,
                pointRadius: 0,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
            x: {
                ticks: { display: false },
            },
            y: {
                min: -2,
                max: 2,
            },
        },
        plugins: {
            legend: { display: false },
            annotation: {
                annotations,
            },
        },
    };

    return (
        <div
            style={{
                width: "100%",
                overflowX: "scroll",
                border: "1px solid #333",
            }}
        >
            <div style={{ width: `${ecgData.length * 2}px`, height: "300px" }}>
                <Line data={data} options={options} />
            </div>
        </div>
    );
};

export default ECGChart;