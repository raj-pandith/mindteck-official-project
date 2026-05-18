package com.mindteck.read_dataset.iot_simulation.service;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

import com.mindteck.read_dataset.iot_simulation.repo.MongoAtlasRepo;
import com.mindteck.read_dataset.iot_simulation.models.MetaData;
import com.mindteck.read_dataset.iot_simulation.models.PushDataToMongoAtlas;

@Service
@RequiredArgsConstructor
public class InsertDataIntoMongoAtlasService {

    private final MongoAtlasRepo atlasRepo;

    private final KafkaTemplate<String, PushDataToMongoAtlas> kafkaTemplate;

    public void insertDatasetSample(double sample, double sample_time) {

        PushDataToMongoAtlas data = new PushDataToMongoAtlas();

        MetaData meta = new MetaData();
        meta.setPatientId("P002");

        data.setMetaData(meta);

        data.setLead2(sample);
        data.setSample_time(sample_time);

        atlasRepo.save(data);

    }

    public void pushToKafka(PushDataToMongoAtlas data) {

        String key = data.getMetaData().getReportId();

        kafkaTemplate.send("rawecg", key, data);

        System.out.println("Data pushed with reportId: " + key);
    }
}
