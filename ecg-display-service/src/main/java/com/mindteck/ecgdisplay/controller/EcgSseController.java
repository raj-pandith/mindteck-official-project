package com.mindteck.ecgdisplay.controller;

import com.mindteck.ecgdisplay.service.EcgChangeStreamService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@CrossOrigin(origins = "*")
public class EcgSseController {

    private final EcgChangeStreamService changeStreamService;

    public EcgSseController(EcgChangeStreamService changeStreamService) {
        this.changeStreamService = changeStreamService;
    }

    @GetMapping(value = "/api/ecg/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        return changeStreamService.subscribe();
    }
}
