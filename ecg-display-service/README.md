# ECG Display Service

A Spring Boot service that subscribes to MongoDB Atlas change streams on the `ecg_signals`
collection and pushes each new ECG sample to connected browsers via Server-Sent Events (SSE).
The browser renders a live scrolling ECG waveform with per-lead views and vital-sign readouts.

---

## Requirements

- Java 21
- Maven 3.8+
- The `datatransferservice` must already be running and connected to MongoDB Atlas
  (or you must be able to call `POST http://localhost:8082/atlas/insert?times=N` to generate data)

---

## Running

```bash
cd ecg-display-service
./mvnw spring-boot:run
```

Then open **http://localhost:8083** in your browser.

---

## How it works

```
datatransferservice              ecg-display-service
  POST /atlas/insert   ──►  MongoDB Atlas (ecg_signals)
                                    │
                          Change Stream (insert events)
                                    │
                          EcgChangeStreamService
                                    │
                          SSE broadcast (text/event-stream)
                                    │
                          GET /api/ecg/stream
                                    │
                          Browser Dashboard (index.html)
                          Live scrolling ECG waveform
```

### Key classes

| Class | Role |
|---|---|
| `EcgChangeStreamService` | Opens MongoDB change stream, maps documents to `EcgSignalEvent`, broadcasts to all registered `SseEmitter` instances |
| `EcgSseController` | Exposes `GET /api/ecg/stream` (text/event-stream). Each browser connection gets its own `SseEmitter` |
| `EcgSignalEvent` | Plain data model mirroring the `ecg_signals` document structure |
| `WebConfig` | CORS configuration for development |
| `static/index.html` | Browser dashboard — Canvas-based live waveform, per-lead tabs, vital readouts, event log |

---

## Dashboard features

- **Live scrolling waveform** — 200-point rolling window, auto-scaling Y axis
- **Lead selector** — Lead II, V1, RA, LL, Overall Voltage
- **Mini-leads** — RA / LL / V1 overview charts below the main waveform
- **Vital readouts** — latest values for Lead II, V1, Overall Voltage, Sample Time
- **Event log** — timestamped list of incoming samples
- **Auto-reconnect** — SSE reconnects automatically if the connection drops
- **Status badge** — CONNECTING → LIVE → ERROR

---

## MongoDB field mapping

The `ecg_signals` collection documents are expected to have:

```json
{
  "metaData": { "patientId": "P001" },
  "V1":  -0.04,
  "LL":   0.22,
  "RA":   0.13,
  "lead2": 0.09,
  "overall_voltage": 0.67,
  "sample_time": 0.0
}
```

> **Note**: the `datatransferservice` stores `metaData` under the key `"metaData"` in the document
> (despite the `@Field("meta")` annotation, Spring Data serialises the Java field name by default
> unless `@Field` is also applied to the getter). The `EcgChangeStreamService` in this project
> checks both `"metaData"` and `"meta"` to handle either case.

---

## Configuration

`src/main/resources/application.yml`

```yaml
server:
  port: 8083

spring:
  mongodb:
    uri: mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
    database: ecg_db
```

Move credentials to environment variables before committing:

```yaml
spring:
  mongodb:
    uri: ${MONGO_URI}
```
