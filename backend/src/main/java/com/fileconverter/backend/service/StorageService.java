package com.fileconverter.backend.service;

import com.fileconverter.backend.config.AppProperties;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.FilenameUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class StorageService {

    private static final Logger log = LoggerFactory.getLogger(StorageService.class);
    private final Path baseTempDir;

    public StorageService(AppProperties appProperties) {
        this.baseTempDir = Paths.get(appProperties.getConversion().getTempDir());
        try {
            Files.createDirectories(this.baseTempDir);
        } catch (IOException e) {
            log.error("Failed to initialize base temp directory: {}", baseTempDir, e);
        }
    }

    public Path createSessionDirectory() throws IOException {
        String sessionFolder = UUID.randomUUID().toString();
        Path sessionPath = baseTempDir.resolve(sessionFolder);
        Files.createDirectories(sessionPath);
        return sessionPath;
    }

    public Path saveUploadedFile(MultipartFile file, Path targetDir) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String safeExtension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            safeExtension = "." + FilenameUtils.getExtension(originalFilename).replaceAll("[^a-zA-Z0-9]", "");
        }
        
        // Use sanitized unique file name to avoid path traversal
        String safeName = "input_" + UUID.randomUUID().toString().substring(0, 8) + safeExtension;
        Path targetPath = targetDir.resolve(safeName).normalize();
        
        // Security check: ensure target stays inside targetDir
        if (!targetPath.startsWith(targetDir)) {
            throw new SecurityException("Potential path traversal detected in filename: " + originalFilename);
        }

        file.transferTo(targetPath.toFile());
        return targetPath;
    }

    public void cleanup(Path directory) {
        if (directory != null && Files.exists(directory)) {
            try {
                FileUtils.deleteDirectory(directory.toFile());
                log.debug("Cleaned up temporary directory: {}", directory);
            } catch (IOException e) {
                log.warn("Failed to cleanly delete temp directory {}: {}", directory, e.getMessage());
            }
        }
    }
}
