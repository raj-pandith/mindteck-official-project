package com.mindteck.read_dataset.iot_simulation.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.jetbrains.bio.npy.NpyArray;
import org.jetbrains.bio.npy.NpyFile;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.mindteck.read_dataset.iot_simulation.models.MetaData;
import com.mindteck.read_dataset.iot_simulation.models.PushDataToMongoAtlas;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReadDatasetService {

    private final InsertDataIntoMongoAtlasService insertDataService;

    /**
     * Original method: Reads from a hardcoded local resource
     */
    public void readEcgDataset(int rows) {
        Path path = Paths.get("src/main/resources/865_SIG_II.npy");
        processNpyFile(path, rows);
    }

    /**
     * Web Upload method: Saves MultipartFile to temp storage and processes it
     */
    public void readEcgDatasetFromUpload(MultipartFile file, int seconds) throws IOException {
        // Create a temporary file to bridge MultipartFile to NIO Path
        Path tempFile = Files.createTempFile("upload-", ".npy");
        try {
            file.transferTo(tempFile);
            // Call the unified processing logic
            processNpyFile(tempFile, seconds);
        } finally {
            // Securely delete the temp file after Kafka ingestion
            Files.deleteIfExists(tempFile);
        }
    }

    /**
     * Unified Processing Logic: Fixes the NullPointerException from image_afa934.png
     */
    private void processNpyFile(Path path, int seconds) {
        
        try {
            NpyArray npyArray = NpyFile.read(path, 1024);
            double[] samples = (double[]) npyArray.getData();
            int frequencySample = 360;
            int rows=seconds*frequencySample;

            int limit = Math.min(rows, samples.length);

            for (int i = 0; i < limit; i++) {
                double timeSeconds = (double) i / frequencySample;

                PushDataToMongoAtlas data = new PushDataToMongoAtlas();
                data.setLead2(samples[i]);
                data.setSample_time(timeSeconds);

                MetaData meta = new MetaData();
                meta.setPatientId("P002"); 
                data.setMetaData(meta);

                insertDataService.pushToKafka(data);
            }
        } catch (Exception e) {
            System.err.println("Error processing NPY file at " + path + ": " + e.getMessage());
            e.printStackTrace();
        }
    }
}