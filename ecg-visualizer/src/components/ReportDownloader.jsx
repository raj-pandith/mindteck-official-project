import React, { useState } from 'react';

const ReportDownloader = () => {
    const [doctorId, setDoctorId] = useState('');
    const [patientId, setPatientId] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleDownload = async () => {
        if (!doctorId || !patientId) { alert("Please enter both Doctor ID and Patient ID"); return; }
        setLoading(true); setSuccess(false);
        try {
            const url = `http://localhost:8000/generate-report?doctor_id=${doctorId}&patient_id=${patientId}`;
            const response = await fetch(url);
            if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Failed'); }
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `report_${patientId}_${doctorId}.pdf`);
            document.body.appendChild(link); link.click(); link.remove();
            window.URL.revokeObjectURL(downloadUrl);
            setSuccess(true);
        } catch (error) {
            console.error("Download Error:", error); alert(`Error: ${error.message}`);
        } finally { setLoading(false); }
    };

    return (
        <div>
            <div style={styles.pageHeader}>
                <div style={styles.sectionTag}>Documentation</div>
                <h2 style={styles.pageTitle}>Clinical Report</h2>
                <p style={styles.pageDesc}>Generate and download a comprehensive ECG analysis report in PDF format.</p>
            </div>

            <div style={styles.reportCard}>
                <div style={styles.reportIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10,9 9,9 8,9"/>
                    </svg>
                </div>

                <h3 style={styles.cardTitle}>ECG Analysis Report</h3>
                <p style={styles.cardDesc}>Enter the physician and patient identifiers to generate a complete diagnostic report including waveform analysis, AF detection summary, and clinical recommendations.</p>

                <div style={styles.formRow}>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Physician ID</label>
                        <input type="text" placeholder="e.g. DR-00089" value={doctorId}
                            onChange={(e) => setDoctorId(e.target.value)} style={styles.input} />
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Patient ID</label>
                        <input type="text" placeholder="e.g. PT-00142" value={patientId}
                            onChange={(e) => setPatientId(e.target.value)} style={styles.input} />
                    </div>
                </div>

                <button onClick={handleDownload} disabled={loading} style={styles.downloadBtn}>
                    {loading ? (
                        <>
                            <span style={styles.spinner} />
                            Generating Report…
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                            </svg>
                            Download PDF Report
                        </>
                    )}
                </button>

                {success && (
                    <div style={styles.successMsg}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20,6 9,17 4,12"/>
                        </svg>
                        Report downloaded successfully.
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    pageHeader: { marginBottom: 32 },
    sectionTag: { fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#d4a843", marginBottom: 6, fontWeight: 500 },
    pageTitle: { fontSize: 28, fontFamily: "'Playfair Display', serif", color: "#f0eeea", marginBottom: 8 },
    pageDesc: { fontSize: 13, color: "#5a5870", margin: 0 },
    reportCard: {
        maxWidth: 520,
        background: "linear-gradient(135deg, rgba(7,13,26,0.9), rgba(12,22,40,0.98))",
        border: "1px solid rgba(212,168,67,0.2)", borderRadius: 18, padding: "36px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(212,168,67,0.04)",
    },
    reportIcon: {
        width: 60, height: 60, borderRadius: 14, marginBottom: 20,
        background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
    },
    cardTitle: { fontSize: 20, fontFamily: "'Playfair Display', serif", color: "#f0eeea", marginBottom: 10 },
    cardDesc: { fontSize: 13, color: "#5a5870", lineHeight: 1.6, marginBottom: 24, margin: "0 0 24px 0" },
    formRow: { display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 },
    fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a5870", fontWeight: 500 },
    input: {
        background: "rgba(255,255,255,0.04)", color: "#f0eeea",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
        padding: "10px 14px", fontSize: 13, outline: "none",
        fontFamily: "'DM Sans', sans-serif", width: 170,
    },
    downloadBtn: {
        display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "center",
        background: "linear-gradient(135deg, #d4a843, #b8893a)",
        color: "#04070f", border: "none", borderRadius: 10,
        padding: "13px 24px", fontSize: 14, fontWeight: 600,
        letterSpacing: "0.03em", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
        boxShadow: "0 4px 24px rgba(212,168,67,0.3)", transition: "all 0.2s",
    },
    spinner: {
        display: "inline-block", width: 14, height: 14, borderRadius: "50%",
        border: "2px solid rgba(4,7,15,0.3)", borderTopColor: "#04070f",
        animation: "spin 0.8s linear infinite",
    },
    successMsg: {
        marginTop: 16, display: "flex", alignItems: "center", gap: 8,
        fontSize: 13, color: "#4ecdc4",
        padding: "10px 14px", background: "rgba(78,205,196,0.08)",
        borderRadius: 8, border: "1px solid rgba(78,205,196,0.2)",
    },
};

export default ReportDownloader;
