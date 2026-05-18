package com.mindteck.ecgdisplay.model;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Mirrors the document structure in the ecg_signals MongoDB collection.
 * Field names match the @Field annotations in the datatransferservice:
 *   V1, LL, RA, lead2, overall_voltage, sample_time, meta.patientId
 */
public class EcgSignalEvent {

    private String patientId;

    @JsonProperty("V1")
    private Double v1;

    @JsonProperty("LL")
    private Double ll;

    @JsonProperty("RA")
    private Double ra;

    private Double lead2;
    private Double overall_voltage;
    private Double sample_time;

    /** Timestamp added by the display service when the change-stream event arrives. */
    private long receivedAt = System.currentTimeMillis();

    public EcgSignalEvent() {}

    public String getPatientId()            { return patientId; }
    public void setPatientId(String v)      { this.patientId = v; }

    public Double getV1()                   { return v1; }
    public void setV1(Double v)             { this.v1 = v; }

    public Double getLl()                   { return ll; }
    public void setLl(Double v)             { this.ll = v; }

    public Double getRa()                   { return ra; }
    public void setRa(Double v)             { this.ra = v; }

    public Double getLead2()                { return lead2; }
    public void setLead2(Double v)          { this.lead2 = v; }

    public Double getOverall_voltage()      { return overall_voltage; }
    public void setOverall_voltage(Double v){ this.overall_voltage = v; }

    public Double getSample_time()          { return sample_time; }
    public void setSample_time(Double v)    { this.sample_time = v; }

    public long getReceivedAt()             { return receivedAt; }
    public void setReceivedAt(long v)       { this.receivedAt = v; }

    @Override
    public String toString() {
        return "EcgSignalEvent{patientId='" + patientId + "', V1=" + v1 +
               ", LL=" + ll + ", RA=" + ra + ", lead2=" + lead2 +
               ", overall_voltage=" + overall_voltage +
               ", sample_time=" + sample_time + "}";
    }
}
