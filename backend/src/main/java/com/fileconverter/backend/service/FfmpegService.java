package com.fileconverter.backend.service;

import com.fileconverter.backend.config.AppProperties;
import com.fileconverter.backend.exception.ConversionException;
import jakarta.annotation.PostConstruct;
import org.apache.commons.io.IOUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
public class FfmpegService {

    private static final Logger log = LoggerFactory.getLogger(FfmpegService.class);
    private final AppProperties appProperties;
    private String resolvedExecutablePath = null;
    private boolean available = false;

    public FfmpegService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @PostConstruct
    public void init() {
        // 1. Try configured path
        String configured = appProperties.getFfmpeg().getPath();
        if (configured != null && !configured.isBlank()) {
            Path p = Paths.get(configured);
            if (Files.isExecutable(p) || (Files.exists(p) && !Files.isDirectory(p))) {
                this.resolvedExecutablePath = p.toAbsolutePath().toString();
                this.available = true;
                log.info("FFmpeg found at configured path: {}", resolvedExecutablePath);
                return;
            }
        }

        // 2. Check known common paths on Windows
        List<String> candidatePaths = List.of(
                "C:/Program Files/Shotcut/ffmpeg.exe",
                "C:/Program Files/Softdeluxe/Free Download Manager/ffmpeg.exe",
                "C:/Program Files/ffmpeg/bin/ffmpeg.exe",
                "C:/ffmpeg/bin/ffmpeg.exe",
                "/usr/bin/ffmpeg",
                "/usr/local/bin/ffmpeg"
        );

        for (String candidate : candidatePaths) {
            Path p = Paths.get(candidate);
            if (Files.exists(p)) {
                this.resolvedExecutablePath = p.toAbsolutePath().toString();
                this.available = true;
                log.info("FFmpeg auto-detected at: {}", resolvedExecutablePath);
                return;
            }
        }

        // 3. Fallback to system PATH
        try {
            Process process = new ProcessBuilder("ffmpeg", "-version").start();
            boolean finished = process.waitFor(3, TimeUnit.SECONDS);
            if (finished && process.exitValue() == 0) {
                this.resolvedExecutablePath = "ffmpeg";
                this.available = true;
                log.info("FFmpeg detected on system PATH.");
                return;
            }
        } catch (Exception ignored) {
            // Not on PATH
        }

        log.warn("FFmpeg not detected. Video conversions requiring FFmpeg will report unavailable.");
    }

    public boolean isAvailable() {
        return available;
    }

    public String getExecutablePath() {
        return resolvedExecutablePath;
    }

    /**
     * Executes FFmpeg safely with a list of arguments without shell interpretation.
     */
    public void execute(List<String> customArgs, long timeoutSeconds) throws ConversionException {
        if (!available) {
            throw new ConversionException("FFmpeg is not installed or configured on the server. Please install FFmpeg to convert video files.");
        }

        List<String> command = new ArrayList<>();
        command.add(resolvedExecutablePath);
        command.add("-y"); // Overwrite output files without asking
        command.addAll(customArgs);

        log.info("Executing FFmpeg command: {}", String.join(" ", command));

        try {
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            String processOutput = IOUtils.toString(process.getInputStream(), StandardCharsets.UTF_8);
            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                throw new ConversionException("FFmpeg conversion timed out after " + timeoutSeconds + " seconds.");
            }

            if (process.exitValue() != 0) {
                log.error("FFmpeg conversion failed (exit code {}): {}", process.exitValue(), processOutput);
                throw new ConversionException("Video conversion failed: " + extractErrorMessage(processOutput));
            }

            log.info("FFmpeg conversion completed successfully.");
        } catch (IOException e) {
            throw new ConversionException("I/O error during FFmpeg execution: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ConversionException("FFmpeg execution was interrupted.", e);
        }
    }

    private String extractErrorMessage(String output) {
        if (output == null || output.isBlank()) {
            return "Unknown error";
        }
        String[] lines = output.split("\n");
        // Return the last 3 lines for context
        int start = Math.max(0, lines.length - 3);
        StringBuilder sb = new StringBuilder();
        for (int i = start; i < lines.length; i++) {
            sb.append(lines[i].trim()).append(" ");
        }
        return sb.toString().trim();
    }
}
