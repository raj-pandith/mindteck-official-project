package com.mindteck.read_dataset.iot_simulation.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.mindteck.read_dataset.iot_simulation.service.ReadDatasetService;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;

@RestController
@RequiredArgsConstructor
@RequestMapping("/dataset/simulation")
@CrossOrigin(origins = "http://localhost:5173")
public class ReadDatasetController {

    private final ReadDatasetService readDatasetService;

    @PostMapping("/read")
    public ResponseEntity<?> readDataset(@RequestParam int rows) {

        readDatasetService.readEcgDataset(rows);

        return new ResponseEntity<>("successfully read " + rows, HttpStatus.ACCEPTED);
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam String patientId,
            @RequestParam String doctorId,
            @RequestParam(defaultValue = "5") int seconds) {
        try {
            readDatasetService.readEcgDatasetFromUpload(file, seconds, patientId, doctorId);
            return ResponseEntity.ok("File processed successfully");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
}
