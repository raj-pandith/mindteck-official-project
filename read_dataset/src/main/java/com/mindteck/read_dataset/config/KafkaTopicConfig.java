package com.mindteck.read_dataset.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

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
