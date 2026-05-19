
---

#  ECG Real-Time AF Detection System Setup Guide

##  Requirements

### 1. Docker Setup (Kafka + Connector)

* Install **Docker Desktop**
* Pull required images:

```bash
docker pull apache/kafka:3.9.0
docker pull confluentinc/cp-kafka-connect:7.6.0
```

---

### 2. Backend & Frontend Requirements

* Java (Stable version)
* Node.js (Stable version)
* Python (3.8+ recommended)
* VS Code (or any IDE)

---

#  Project Setup

---

## 1. Model (FastAPI Backend)

```bash
cd Model
python -m venv venv
```

###  Activate Virtual Environment

**Windows:**

```bash
venv\Scripts\activate
```

###  Install Dependencies

```bash
pip install -r requirements.txt
```

###  Run FastAPI Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

###  Access API Docs

```
http://localhost:8000/docs
```

---

##  2. ECG Visualizer (React Frontend)

```bash
cd ecg-visualizer
npm install
npm run dev
```

###  Open in Browser

```
http://localhost:5173
```

---

##  3. ECG Display Service (Spring Boot - Live Data)

```bash
cd ecg-display-service
./mvnw spring-boot:run
```

---

## 4. Read Dataset Service (Kafka + MongoDB Pipeline)

```bash
cd read_dataset
```

###  Start Kafka + Kafka Connect

```bash
docker compose up -d
```

---

### 5.  Create MongoDB Sink Connector

```bash
curl -X POST http://localhost:8083/connectors \
-H "Content-Type: application/json" \
-d '{
  "name": "mongo-sink",
  "config": {
    "connector.class": "com.mongodb.kafka.connect.MongoSinkConnector",
    "topics": "rawecg",

    "connection.uri": "mongodb+srv://helloworld:HelloWorld123%24@cluster0.3qqf88m.mongodb.net/ecg_db?retryWrites=true&w=majority",
    "database": "ecg_db",
    "collection": "ecg_signals",

    "value.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter.schemas.enable": "false"
  }
}'
```

---

###  6. Run Dataset Reader Service

```bash
./mvnw spring-boot:run
```