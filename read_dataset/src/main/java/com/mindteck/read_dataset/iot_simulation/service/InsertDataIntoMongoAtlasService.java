package com.mindteck.read_dataset.iot_simulation.service;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import com.mindteck.read_dataset.iot_simulation.models.PushDataToMongoAtlas;

@Slf4j
@Service
@RequiredArgsConstructor
public class InsertDataIntoMongoAtlasService {

    private final KafkaTemplate<String, PushDataToMongoAtlas> kafkaTemplate;

    // method to push the ECG data to Kafka topic
    public void pushToKafka(PushDataToMongoAtlas data) {
        String key = data.getMetaData().getReportId();
        kafkaTemplate.send(
                "rawecg", key, data)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to send ECG data", ex);
                    } else {
                        log.info("Sent to partition: {}",
                                result.getRecordMetadata().partition());
                    }
                });
    }
}
