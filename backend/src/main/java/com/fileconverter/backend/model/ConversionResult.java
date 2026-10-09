package com.fileconverter.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.nio.file.Path;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversionResult {
    private Path outputPath;
    private String filename;
    private String contentType;
    private long fileSize;
    private boolean isZip;
}
