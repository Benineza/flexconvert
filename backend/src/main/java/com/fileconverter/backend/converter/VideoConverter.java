package com.fileconverter.backend.converter;

import com.fileconverter.backend.exception.ConversionException;
import com.fileconverter.backend.model.ConversionOptions;
import com.fileconverter.backend.model.ConversionResult;
import com.fileconverter.backend.service.FfmpegService;
import org.apache.commons.io.FilenameUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Component
public class VideoConverter implements FileConverter {

    private static final Logger log = LoggerFactory.getLogger(VideoConverter.class);
    private static final Set<String> SUPPORTED_VIDEO_FORMATS = Set.of("mp4", "mov", "mkv", "webm", "avi");

    private final FfmpegService ffmpegService;

    public VideoConverter(FfmpegService ffmpegService) {
        this.ffmpegService = ffmpegService;
    }

    @Override
    public boolean canConvert(String sourceFormat, String targetFormat) {
        String src = sourceFormat.toLowerCase();
        String tgt = targetFormat.toLowerCase();
        return SUPPORTED_VIDEO_FORMATS.contains(src) && SUPPORTED_VIDEO_FORMATS.contains(tgt) && !src.equals(tgt);
    }

    @Override
    public ConversionResult convert(Path inputFile, String targetFormat, Path outputDir, ConversionOptions options) {
        if (!ffmpegService.isAvailable()) {
            throw new ConversionException("FFmpeg is not installed or detected on this server. Video conversions cannot proceed.");
        }

        String baseName = FilenameUtils.getBaseName(inputFile.getFileName().toString());
        if (baseName.startsWith("input_") && baseName.length() > 14) {
            baseName = "video";
        }
        String format = targetFormat.toLowerCase();
        String outputFilename = baseName + "." + format;
        Path outputPath = outputDir.resolve(outputFilename);

        List<String> args = new ArrayList<>();
        args.add("-i");
        args.add(inputFile.toAbsolutePath().toString());

        // Target codec selection based on target container
        switch (format) {
            case "webm" -> {
                args.add("-c:v");
                args.add("libvpx");
                args.add("-b:v");
                args.add("1M");
                args.add("-c:a");
                args.add("libvorbis");
            }
            case "mp4" -> {
                args.add("-c:v");
                args.add("libx264");
                args.add("-pix_fmt");
                args.add("yuv420p");
                args.add("-c:a");
                args.add("aac");
                args.add("-movflags");
                args.add("+faststart");
            }
            case "mov" -> {
                args.add("-c:v");
                args.add("libx264");
                args.add("-c:a");
                args.add("aac");
            }
            case "mkv" -> {
                args.add("-c:v");
                args.add("libx264");
                args.add("-c:a");
                args.add("aac");
            }
            case "avi" -> {
                args.add("-c:v");
                args.add("mpeg4");
                args.add("-c:a");
                args.add("libmp3lame");
            }
            default -> {
                // Fallback default re-encoding
                args.add("-c:v");
                args.add("copy");
                args.add("-c:a");
                args.add("copy");
            }
        }

        args.add(outputPath.toAbsolutePath().toString());

        try {
            ffmpegService.execute(args, 300); // 5-minute timeout for transcoding

            if (!Files.exists(outputPath) || Files.size(outputPath) == 0) {
                throw new ConversionException("FFmpeg transcoding produced an empty or missing output file.");
            }

            return ConversionResult.builder()
                    .outputPath(outputPath)
                    .filename(outputFilename)
                    .contentType(getContentType(format))
                    .fileSize(Files.size(outputPath))
                    .isZip(false)
                    .build();

        } catch (Exception e) {
            log.error("Video conversion failed: {}", e.getMessage(), e);
            throw new ConversionException("Video conversion failed: " + e.getMessage(), e);
        }
    }

    private String getContentType(String format) {
        return switch (format.toLowerCase()) {
            case "mp4" -> "video/mp4";
            case "mov" -> "video/quicktime";
            case "mkv" -> "video/x-matroska";
            case "webm" -> "video/webm";
            case "avi" -> "video/x-msvideo";
            default -> "application/octet-stream";
        };
    }
}
