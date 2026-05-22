package com.mindteck.read_dataset.iot_simulation.service;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

import com.mindteck.read_dataset.iot_simulation.models.PushDataToMongoAtlas;

@Service
@RequiredArgsConstructor
public class InsertDataIntoMongoAtlasService {

    private final KafkaTemplate<String, PushDataToMongoAtlas> kafkaTemplate;

    public void pushToKafka(PushDataToMongoAtlas data) {

        String key = data.getMetaData().getReportId();

        kafkaTemplate.send("rawecg", key, data);

        System.out.println("Data pushed with reportId: " + key);
    }
}
