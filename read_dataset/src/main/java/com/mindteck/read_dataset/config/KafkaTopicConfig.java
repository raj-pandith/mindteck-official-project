package com.mindteck.read_dataset.config;

import java.util.HashMap;
import java.util.Map;

import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

@Configuration
public class KafkaTopicConfig {

    @Bean
    public NewTopic ecgTopic() {
        return new NewTopic(
                "rawecg", // topic name
                3, // number of partitions
                (short) 1 // replication factor
        );
    }

}
