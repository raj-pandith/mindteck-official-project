package com.mindteck.read_dataset.iot_simulation.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Data
@ToString
@Document(collection = "ecg_signals")
public class PushDataToMongoAtlas {

    @Id
    private String id;

    @Field("meta")
    private MetaData metaData;

    @Field("V1")
    private Double v1;

    @Field("LL")
    private Double ll;

    @Field("RA")
    private Double ra;

    @Field("lead2")
    private Double lead2;

    @Field("overall_voltage")
    private Double overall_voltage;

    @Field("sample_time")
    private Double sample_time;
}
