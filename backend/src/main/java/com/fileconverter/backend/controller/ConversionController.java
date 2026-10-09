package com.fileconverter.backend.controller;

import com.fileconverter.backend.exception.FileValidationException;
import com.fileconverter.backend.model.ConversionOptions;
import com.fileconverter.backend.model.ConversionResult;
import com.fileconverter.backend.service.ConversionService;
import com.fileconverter.backend.service.StorageService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("/api")
public class ConversionController {

    private final ConversionService conversionService;
    private final StorageService storageService;

    public ConversionController(ConversionService conversionService, StorageService storageService) {
        this.conversionService = conversionService;
        this.storageService = storageService;
    }

    @PostMapping(value = "/convert", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<StreamingResponseBody> convert(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            @RequestParam("targetFormat") String targetFormat,
            @RequestParam(value = "pageSelection", defaultValue = "all") String pageSelection,
            @RequestParam(value = "pageStart", defaultValue = "1") int pageStart,
            @RequestParam(value = "pageEnd", defaultValue = "1") int pageEnd,
            @RequestParam(value = "quality", defaultValue = "90") int quality,
            @RequestParam(value = "dpi", defaultValue = "150") int dpi,
            @RequestParam(value = "pageSize", defaultValue = "a4") String pageSize,
            @RequestParam(value = "orientation", defaultValue = "portrait") String orientation,
            @RequestParam(value = "imageFit", defaultValue = "fit") String imageFit
    ) throws IOException {

        ConversionOptions options = ConversionOptions.builder()
                .pageSelection(pageSelection)
                .pageStart(pageStart)
                .pageEnd(pageEnd)
                .quality(quality)
                .dpi(dpi)
                .pageSize(pageSize)
                .orientation(orientation)
                .imageFit(imageFit)
                .build();

        ConversionResult result;

        if (files != null && files.size() > 1 && "pdf".equalsIgnoreCase(targetFormat.trim())) {
            result = conversionService.convertMultipleImagesToPdf(files, options);
        } else if (file != null && !file.isEmpty()) {
            result = conversionService.convertSingleFile(file, targetFormat, options);
        } else if (files != null && !files.isEmpty()) {
            result = conversionService.convertSingleFile(files.get(0), targetFormat, options);
        } else {
            throw new FileValidationException("No file provided for conversion.");
        }

        Path outputPath = result.getOutputPath();
        Path sessionDir = outputPath.getParent().getParent(); // sessionDir/output/filename

        StreamingResponseBody responseBody = outputStream -> {
            try (InputStream in = Files.newInputStream(outputPath)) {
                in.transferTo(outputStream);
            } finally {
                storageService.cleanup(sessionDir);
            }
        };

        ContentDisposition contentDisposition = ContentDisposition.attachment()
                .filename(result.getFilename())
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition.toString())
                .contentType(MediaType.parseMediaType(result.getContentType()))
                .contentLength(result.getFileSize())
                .body(responseBody);
    }
}
