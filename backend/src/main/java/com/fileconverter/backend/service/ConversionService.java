package com.fileconverter.backend.service;

import com.fileconverter.backend.converter.FileConverter;
import com.fileconverter.backend.converter.ImageToPdfConverter;
import com.fileconverter.backend.exception.FileValidationException;
import com.fileconverter.backend.exception.UnsupportedConversionException;
import com.fileconverter.backend.model.ConversionOptions;
import com.fileconverter.backend.model.ConversionResult;
import org.apache.commons.io.FilenameUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Service
public class ConversionService {

    private static final Logger log = LoggerFactory.getLogger(ConversionService.class);

    private final List<FileConverter> converters;
    private final ImageToPdfConverter imageToPdfConverter;
    private final StorageService storageService;

    public ConversionService(List<FileConverter> converters,
                             ImageToPdfConverter imageToPdfConverter,
                             StorageService storageService) {
        this.converters = converters;
        this.imageToPdfConverter = imageToPdfConverter;
        this.storageService = storageService;
    }

    public ConversionResult convertSingleFile(MultipartFile file, String targetFormat, ConversionOptions options) throws IOException {
        validateFile(file);

        String originalFilename = file.getOriginalFilename();
        String sourceFormat = FilenameUtils.getExtension(originalFilename).toLowerCase();
        String target = targetFormat.toLowerCase().trim();

        if (sourceFormat.equals(target)) {
            throw new FileValidationException("Source and target format cannot be the same (" + target + ").");
        }

        FileConverter matchingConverter = findConverter(sourceFormat, target);
        if (matchingConverter == null) {
            throw new UnsupportedConversionException(sourceFormat, target);
        }

        Path sessionDir = storageService.createSessionDirectory();
        try {
            Path uploadedFilePath = storageService.saveUploadedFile(file, sessionDir);
            Path outputDir = sessionDir.resolve("output");
            java.nio.file.Files.createDirectories(outputDir);

            log.info("Starting conversion: {} (format: {}) -> {} using {}",
                    originalFilename, sourceFormat, target, matchingConverter.getClass().getSimpleName());

            ConversionResult result = matchingConverter.convert(uploadedFilePath, target, outputDir, options);
            log.info("Conversion finished successfully: {}", result.getFilename());
            return result;
        } catch (Exception e) {
            storageService.cleanup(sessionDir);
            throw e;
        }
    }

    public ConversionResult convertMultipleImagesToPdf(List<MultipartFile> files, ConversionOptions options) throws IOException {
        if (files == null || files.isEmpty()) {
            throw new FileValidationException("No files provided for PDF compilation.");
        }

        Path sessionDir = storageService.createSessionDirectory();
        try {
            List<Path> savedFiles = new ArrayList<>();
            for (MultipartFile f : files) {
                validateFile(f);
                String ext = FilenameUtils.getExtension(f.getOriginalFilename()).toLowerCase();
                if (!imageToPdfConverter.canConvert(ext, "pdf")) {
                    throw new FileValidationException("File '" + f.getOriginalFilename() + "' is not a supported image format for PDF compilation.");
                }
                savedFiles.add(storageService.saveUploadedFile(f, sessionDir));
            }

            Path outputDir = sessionDir.resolve("output");
            java.nio.file.Files.createDirectories(outputDir);

            log.info("Compiling {} images into single PDF document", savedFiles.size());
            return imageToPdfConverter.convertMultiple(savedFiles, outputDir, options);
        } catch (Exception e) {
            storageService.cleanup(sessionDir);
            throw e;
        }
    }

    private FileConverter findConverter(String sourceFormat, String targetFormat) {
        for (FileConverter converter : converters) {
            if (converter.canConvert(sourceFormat, targetFormat)) {
                return converter;
            }
        }
        return null;
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new FileValidationException("Uploaded file is empty or missing.");
        }
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.contains(".")) {
            throw new FileValidationException("File must have a valid name and file extension.");
        }
    }
}
