package com.mindteck.ecgdisplay.service;

import com.mindteck.ecgdisplay.model.EcgSignalEvent;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Aggregates;
import com.mongodb.client.model.Filters;
import jakarta.annotation.PostConstruct;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class EcgChangeStreamService {

    private static final Logger log = LoggerFactory.getLogger(EcgChangeStreamService.class);

    private final MongoTemplate mongoTemplate;
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public EcgChangeStreamService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(()    -> emitters.remove(emitter));
        emitter.onError(e       -> emitters.remove(emitter));
        emitters.add(emitter);
        log.info("SSE client connected. Total active: {}", emitters.size());
        return emitter;
    }

    @PostConstruct
    public void startChangeStreamListener() {
        Thread t = new Thread(this::listenForChanges, "ecg-change-stream-thread");
        t.setDaemon(true);
        t.start();
        log.info("ECG change stream listener started.");
    }

    private void listenForChanges() {
        MongoCollection<Document> collection =
                mongoTemplate.getDb().getCollection("ecg_signals");

        List<Bson> pipeline = List.of(
                Aggregates.match(Filters.eq("operationType", "insert")));

        log.info("Watching ecg_signals collection for inserts...");

        collection.watch(pipeline).forEach(event -> {
            try {
                Document doc = event.getFullDocument();
                if (doc == null) return;
                EcgSignalEvent signal = mapDocumentToEvent(doc);
                log.debug("Change stream event: {}", signal);
                broadcast(signal);
            } catch (Exception e) {
                log.error("Error processing change stream event", e);
            }
        });
    }

    private EcgSignalEvent mapDocumentToEvent(Document doc) {
        EcgSignalEvent event = new EcgSignalEvent();

        Document meta = doc.get("metaData", Document.class);
        if (meta == null) meta = doc.get("meta", Document.class);
        if (meta != null) event.setPatientId(meta.getString("patientId"));

        event.setV1(getDouble(doc, "V1"));
        event.setLl(getDouble(doc, "LL"));
        event.setRa(getDouble(doc, "RA"));
        event.setLead2(getDouble(doc, "lead2"));
        event.setOverall_voltage(getDouble(doc, "overall_voltage"));
        event.setSample_time(getDouble(doc, "sample_time"));
        event.setReceivedAt(System.currentTimeMillis());

        return event;
    }

    private Double getDouble(Document doc, String key) {
        Object val = doc.get(key);
        if (val instanceof Number n) return n.doubleValue();
        return null;
    }

    private void broadcast(EcgSignalEvent event) {
        List<SseEmitter> dead = new ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("ecg").data(event));
            } catch (IOException e) {
                dead.add(emitter);
            }
        }
        emitters.removeAll(dead);
        if (!dead.isEmpty()) log.debug("Removed {} dead SSE emitter(s).", dead.size());
    }
}
