import React, { useState } from 'react';

const ReportDownloader = () => {
    const [doctorId, setDoctorId] = useState('');
    const [patientId, setPatientId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        if (!doctorId || !patientId) {
            alert("Please enter both Doctor ID and Patient ID");
            return;
        }

        setLoading(true);
        try {
            // Adjust the URL if your FastAPI is on a different port (e.g., 8000)
            const baseUrl = "http://localhost:8000";
            const url = `${baseUrl}/generate-report?doctor_id=${doctorId}&patient_id=${patientId}`;

            const response = await fetch(url, {
                method: 'GET',
            });

            if (!response.ok) {
                // If the server returns an error (404, 500, etc.), 
                // the response body will contain JSON detailing the error
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to download report');
            }

            // Successfully received PDF as a Blob
            const blob = await response.blob();

            // Create a temporary URL for the blob
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = downloadUrl;
            link.setAttribute('download', `report_${patientId}_${doctorId}.pdf`);

            // Append to body and click to trigger download
            document.body.appendChild(link);
            link.click();

            // Cleanup: remove the link and revoke the URL object
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

        } catch (error) {
            console.error("Download Error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.header}>Download ECG Report</h2>
            <input
                style={styles.input}
                placeholder="Doctor ID"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
            />
            <input
                style={styles.input}
                placeholder="Patient ID"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
            />
            <button
                style={{
                    ...styles.button,
                    backgroundColor: loading ? '#6c757d' : '#007bff'
                }}
                onClick={handleDownload}
                disabled={loading}
            >
                {loading ? 'Generating...' : 'Download PDF Report'}
            </button>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        width: '320px',
        margin: '50px auto',
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        gap: '12px',
        fontFamily: 'Arial, sans-serif'
    },
    header: { margin: '0 0 10px 0', fontSize: '18px', textAlign: 'center' },
    input: { padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' },
    button: {
        padding: '10px',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold'
    }
};

export default ReportDownloader;