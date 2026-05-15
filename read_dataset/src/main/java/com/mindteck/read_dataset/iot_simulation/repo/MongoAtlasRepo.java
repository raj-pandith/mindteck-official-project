package com.mindteck.read_dataset.iot_simulation.repo;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.mindteck.read_dataset.iot_simulation.models.PushDataToMongoAtlas;

@Repository
public interface MongoAtlasRepo extends MongoRepository<PushDataToMongoAtlas, String> {

}
