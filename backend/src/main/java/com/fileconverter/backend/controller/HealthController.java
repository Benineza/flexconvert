package com.fileconverter.backend.controller;

import com.fileconverter.backend.service.FfmpegService;
import com.fileconverter.backend.service.LibreOfficeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final FfmpegService ffmpegService;
    private final LibreOfficeService libreOfficeService;

    public HealthController(FfmpegService ffmpegService, LibreOfficeService libreOfficeService) {
        this.ffmpegService = ffmpegService;
        this.libreOfficeService = libreOfficeService;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "ffmpegAvailable", ffmpegService.isAvailable(),
                "libreOfficeAvailable", libreOfficeService.isAvailable()
        ));
    }
}
