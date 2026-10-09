package com.fileconverter.backend.converter;

import com.fileconverter.backend.model.ConversionOptions;
import com.fileconverter.backend.model.ConversionResult;

import java.nio.file.Path;

public interface FileConverter {
    boolean canConvert(String sourceFormat, String targetFormat);
    ConversionResult convert(Path inputFile, String targetFormat, Path outputDir, ConversionOptions options);
}
