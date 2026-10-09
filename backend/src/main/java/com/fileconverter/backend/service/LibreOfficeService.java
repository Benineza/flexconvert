package com.fileconverter.backend.service;

import com.fileconverter.backend.config.AppProperties;
import com.fileconverter.backend.exception.ConversionException;
import jakarta.annotation.PostConstruct;
import org.apache.commons.io.IOUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
public class LibreOfficeService {

    private static final Logger log = LoggerFactory.getLogger(LibreOfficeService.class);
    private final AppProperties appProperties;
    private String resolvedExecutablePath = null;
    private boolean available = false;

    public LibreOfficeService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @PostConstruct
    public void init() {
        String configured = appProperties.getLibreoffice().getPath();
        if (configured != null && !configured.isBlank()) {
            Path p = Paths.get(configured);
            if (Files.exists(p)) {
                this.resolvedExecutablePath = p.toAbsolutePath().toString();
                this.available = true;
                log.info("LibreOffice detected at configured path: {}", resolvedExecutablePath);
                return;
            }
        }

        List<String> candidates = List.of(
                "C:/Program Files/LibreOffice/program/soffice.exe",
                "C:/Program Files (x86)/LibreOffice/program/soffice.exe",
                "/usr/bin/soffice",
                "/usr/local/bin/soffice"
        );

        for (String candidate : candidates) {
            Path p = Paths.get(candidate);
            if (Files.exists(p)) {
                this.resolvedExecutablePath = p.toAbsolutePath().toString();
                this.available = true;
                log.info("LibreOffice auto-detected at: {}", resolvedExecutablePath);
                return;
            }
        }

        try {
            Process process = new ProcessBuilder("soffice", "--version").start();
            boolean finished = process.waitFor(3, TimeUnit.SECONDS);
            if (finished && process.exitValue() == 0) {
                this.resolvedExecutablePath = "soffice";
                this.available = true;
                log.info("LibreOffice detected on system PATH.");
                return;
            }
        } catch (Exception ignored) {
            // Not on PATH
        }

        log.info("LibreOffice not detected. Pure Java converters will be used for document conversions.");
    }

    public boolean isAvailable() {
        return available;
    }

    public void convertToPdf(Path inputFile, Path outputDir, long timeoutSeconds) throws ConversionException {
        if (!available) {
            throw new ConversionException("LibreOffice is not available.");
        }

        List<String> command = List.of(
                resolvedExecutablePath,
                "--headless",
                "--convert-to", "pdf",
                inputFile.toAbsolutePath().toString(),
                "--outdir", outputDir.toAbsolutePath().toString()
        );

        log.info("Executing LibreOffice command: {}", String.join(" ", command));

        try {
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            String processOutput = IOUtils.toString(process.getInputStream(), StandardCharsets.UTF_8);
            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                throw new ConversionException("LibreOffice conversion timed out.");
            }

            if (process.exitValue() != 0) {
                throw new ConversionException("LibreOffice conversion failed: " + processOutput);
            }
        } catch (IOException e) {
            throw new ConversionException("I/O error during LibreOffice conversion: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ConversionException("LibreOffice conversion interrupted.", e);
        }
    }
}
