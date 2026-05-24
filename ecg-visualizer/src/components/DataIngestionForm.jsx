import React from "react";

function DataIngestionForm({
    fileInputRef, handleFileChange, uploading, patientId, setPatientId,
    doctorId, setDoctorId, seconds, setSeconds, handleSubmit, selectedFile
}) {
    return (
        <div style={styles.card}>
            <div style={styles.cardHeader}>
                <div style={styles.headerLeft}>
                    <div style={styles.sectionTag}>Input</div>
                    <h3 style={styles.cardTitle}>Dataset Ingestion</h3>
                </div>
                {uploading && (
                    <div style={styles.processingBadge}>
                        <span style={styles.spinner} />
                        Processing...
                    </div>
                )}
            </div>

            <div style={styles.formGrid}>
                {/* File Upload */}
                <div style={styles.fieldGroup}>
                    <label style={styles.label}>ECG Data File</label>
                    <label style={styles.fileLabel}>
                        <input ref={fileInputRef} type="file" accept=".npy"
                            onChange={handleFileChange} disabled={uploading}
                            style={{ display: "none" }} />
                        <div style={{ ...styles.fileButton, opacity: uploading ? 0.5 : 1 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                            </svg>
                            {selectedFile ? selectedFile.name : "Choose .npy file"}
                        </div>
                    </label>
                </div>

                {/* Patient ID */}
                <div style={styles.fieldGroup}>
                    <label style={styles.label}>Patient ID</label>
                    <input type="text" placeholder="e.g. PT-00142" value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        style={styles.input} />
                </div>

                {/* Doctor ID */}
                <div style={styles.fieldGroup}>
                    <label style={styles.label}>Physician ID</label>
                    <input type="text" placeholder="e.g. DR-00089" value={doctorId}
                        onChange={(e) => setDoctorId(e.target.value)}
                        style={styles.input} />
                </div>

                {/* Seconds */}
                <div style={styles.fieldGroup}>
                    <label style={styles.label}>Window (seconds)</label>
                    <input type="number" value={seconds}
                        onChange={(e) => setSeconds(Math.max(5, Number(e.target.value)))}
                        style={{ ...styles.input, width: 100 }} />
                </div>

                {/* Submit */}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <button onClick={handleSubmit}
                        disabled={uploading || !selectedFile}
                        style={{ ...styles.submitBtn, opacity: (uploading || !selectedFile) ? 0.4 : 1,
                            cursor: (uploading || !selectedFile) ? "not-allowed" : "pointer" }}>
                        {uploading ? "Uploading…" : "Begin Analysis"}
                        {!uploading && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 8 }}>
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {uploading && (
                <div style={styles.uploadStatus}>
                    <div style={styles.progressBar}>
                        <div style={styles.progressFill} />
                    </div>
                    <span style={{ fontSize: 12, color: "#a8a4b8" }}>
                        Parsing NPY file and dispatching to Kafka stream…
                    </span>
                </div>
            )}
        </div>
    );
}

const styles = {
    card: {
        background: "linear-gradient(135deg, rgba(7,13,26,0.9) 0%, rgba(12,22,40,0.95) 100%)",
        border: "1px solid rgba(212,168,67,0.18)",
        borderRadius: 16, padding: "24px 28px", marginBottom: 24,
        boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(212,168,67,0.04)",
        position: "relative", overflow: "hidden",
    },
    cardHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
    headerLeft: {},
    sectionTag: {
        fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
        color: "#d4a843", marginBottom: 4, fontWeight: 500,
    },
    cardTitle: { fontSize: 18, fontFamily: "'Playfair Display', serif", color: "#f0eeea" },
    processingBadge: {
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 14px", borderRadius: 8, fontSize: 12,
        background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)", color: "#d4a843",
    },
    spinner: {
        display: "inline-block", width: 10, height: 10, borderRadius: "50%",
        border: "2px solid rgba(212,168,67,0.3)", borderTopColor: "#d4a843",
        animation: "spin 0.8s linear infinite",
    },
    formGrid: { display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" },
    fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
    label: {
        fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
        color: "#5a5870", fontWeight: 500,
    },
    input: {
        background: "rgba(255,255,255,0.04)", color: "#f0eeea",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
        padding: "10px 14px", fontSize: 13, outline: "none",
        fontFamily: "'DM Sans', sans-serif",
        transition: "border-color 0.2s",
        width: 160,
    },
    fileLabel: { cursor: "pointer" },
    fileButton: {
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(255,255,255,0.04)", color: "#a8a4b8",
        border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 8,
        padding: "10px 14px", fontSize: 13, maxWidth: 220,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        transition: "all 0.2s",
    },
    submitBtn: {
        display: "flex", alignItems: "center",
        background: "linear-gradient(135deg, #d4a843, #b8893a)",
        color: "#04070f", border: "none", borderRadius: 8,
        padding: "11px 22px", fontSize: 13, fontWeight: 600,
        letterSpacing: "0.04em", fontFamily: "'DM Sans', sans-serif",
        boxShadow: "0 4px 20px rgba(212,168,67,0.3)",
        transition: "all 0.2s",
    },
    uploadStatus: { marginTop: 16, display: "flex", flexDirection: "column", gap: 8 },
    progressBar: { height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" },
    progressFill: {
        height: "100%", width: "60%", borderRadius: 2,
        background: "linear-gradient(90deg, #d4a843, #4ecdc4)",
        animation: "progress-slide 1.5s ease-in-out infinite",
    },
};

export default DataIngestionForm;
