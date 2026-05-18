import React from "react";

function DataIngestionForm({
    fileInputRef,
    handleFileChange,
    uploading,
    patientId,
    setPatientId,
    doctorId,
    setDoctorId,
    seconds,
    setSeconds,
    handleSubmit,
    selectedFile
}) {
    return (
        <div style={{
            marginBottom: "30px",
            padding: "25px",
            border: "2px solid #0f0",
            borderRadius: "12px",
            backgroundColor: "#111"
        }}>
            <h3 style={{ marginTop: 0, borderBottom: "1px solid #0f0", paddingBottom: "10px" }}>
                ECG DATASET INGESTION
            </h3>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "flex-end" }}>
                {/* File Input */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <label style={{ marginBottom: "5px", fontSize: "12px" }}>SELECT .NPY FILE:</label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".npy"
                        onChange={handleFileChange}
                        disabled={uploading}
                        style={{ color: "#0f0" }}
                    />
                </div>

                {/* Patient ID */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <label style={{ marginBottom: "5px", fontSize: "12px" }}>PATIENT ID:</label>
                    <input
                        type="text"
                        placeholder="Enter Patient ID"
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        style={{ background: "#000", color: "#0f0", border: "1px solid #0f0", padding: "8px", width: "150px" }}
                    />
                </div>

                {/* Doctor ID */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <label style={{ marginBottom: "5px", fontSize: "12px" }}>DOCTOR ID:</label>
                    <input
                        type="text"
                        placeholder="Enter Doctor ID"
                        value={doctorId}
                        onChange={(e) => setDoctorId(e.target.value)}
                        style={{ background: "#000", color: "#0f0", border: "1px solid #0f0", padding: "8px", width: "150px" }}
                    />
                </div>

                {/* Seconds Counter */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <label style={{ marginBottom: "5px", fontSize: "12px" }}>SECONDS TO READ:</label>
                    <input
                        type="number"
                        value={seconds}
                        onChange={(e) => setSeconds(Math.max(5, Number(e.target.value)))}
                        style={{ background: "#000", color: "#0f0", border: "1px solid #0f0", padding: "8px", width: "120px" }}
                    />
                </div>

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={uploading || !selectedFile}
                    style={{
                        padding: "10px 25px",
                        backgroundColor: uploading || !selectedFile ? "#333" : "#0f0",
                        color: uploading || !selectedFile ? "#888" : "#000",
                        border: "none",
                        borderRadius: "4px",
                        fontWeight: "bold",
                        cursor: uploading || !selectedFile ? "not-allowed" : "pointer",
                        textTransform: "uppercase"
                    }}
                >
                    {uploading ? "Processing..." : "Upload"}
                </button>
            </div>

            {uploading && (
                <div style={{ marginTop: "15px", color: "yellow", fontSize: "14px" }}>
                    SYSTEM BUSY: Parsing NPY and pushing to Kafka...
                </div>
            )}
        </div>
    );
}

export default DataIngestionForm;