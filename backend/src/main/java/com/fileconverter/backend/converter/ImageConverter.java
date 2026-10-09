package com.fileconverter.backend.converter;

import com.fileconverter.backend.exception.ConversionException;
import com.fileconverter.backend.model.ConversionOptions;
import com.fileconverter.backend.model.ConversionResult;
import com.fileconverter.backend.service.FfmpegService;
import org.apache.batik.transcoder.TranscoderInput;
import org.apache.batik.transcoder.TranscoderOutput;
import org.apache.batik.transcoder.image.PNGTranscoder;
import org.apache.commons.io.FilenameUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.List;
import java.util.Set;

@Component
public class ImageConverter implements FileConverter {

    private static final Logger log = LoggerFactory.getLogger(ImageConverter.class);
    private static final Set<String> SUPPORTED_FORMATS = Set.of(
            "png", "jpg", "jpeg", "webp", "avif", "tiff", "svg", "ico", "gif"
    );

    private final FfmpegService ffmpegService;

    public ImageConverter(FfmpegService ffmpegService) {
        this.ffmpegService = ffmpegService;
    }

    @Override
    public boolean canConvert(String sourceFormat, String targetFormat) {
        String src = sourceFormat.toLowerCase();
        String tgt = targetFormat.toLowerCase();
        return SUPPORTED_FORMATS.contains(src) && SUPPORTED_FORMATS.contains(tgt) && !src.equals(tgt);
    }

    @Override
    public ConversionResult convert(Path inputFile, String targetFormat, Path outputDir, ConversionOptions options) {
        String baseName = FilenameUtils.getBaseName(inputFile.getFileName().toString());
        if (baseName.startsWith("input_") && baseName.length() > 14) {
            baseName = "image";
        }
        String format = targetFormat.toLowerCase();
        String outputFilename = baseName + "." + format;
        Path outputPath = outputDir.resolve(outputFilename);

        try {
            BufferedImage image = readImage(inputFile);
            if (image == null) {
                // If pure Java read fails, try FFmpeg directly
                if (ffmpegService.isAvailable()) {
                    ffmpegService.execute(List.of(
                            "-i", inputFile.toAbsolutePath().toString(),
                            outputPath.toAbsolutePath().toString()
                    ), 30);
                    return buildResult(outputPath, outputFilename, format);
                }
                throw new ConversionException("Unable to decode input image: " + inputFile.getFileName());
            }

            // Write image in target format
            writeTargetImage(image, format, outputPath, inputFile);

            if (!Files.exists(outputPath) || Files.size(outputPath) == 0) {
                throw new ConversionException("Output image was not generated or is empty.");
            }

            return buildResult(outputPath, outputFilename, format);

        } catch (Exception e) {
            log.error("Image conversion failed: {}", e.getMessage(), e);
            throw new ConversionException("Image conversion failed: " + e.getMessage(), e);
        }
    }

    private BufferedImage readImage(Path inputPath) throws IOException {
        String ext = FilenameUtils.getExtension(inputPath.getFileName().toString()).toLowerCase();

        if ("svg".equalsIgnoreCase(ext)) {
            try (InputStream is = Files.newInputStream(inputPath);
                 ByteArrayOutputStream pngOut = new ByteArrayOutputStream()) {
                PNGTranscoder transcoder = new PNGTranscoder();
                TranscoderInput input = new TranscoderInput(is);
                TranscoderOutput output = new TranscoderOutput(pngOut);
                transcoder.transcode(input, output);
                return ImageIO.read(new ByteArrayInputStream(pngOut.toByteArray()));
            } catch (Exception e) {
                log.warn("Batik failed to transcode SVG: {}", e.getMessage());
            }
        }

        BufferedImage img = ImageIO.read(inputPath.toFile());
        if (img != null) {
            return img;
        }

        if (ffmpegService.isAvailable()) {
            Path tempPng = inputPath.getParent().resolve("tmp_read_" + inputPath.getFileName() + ".png");
            try {
                ffmpegService.execute(List.of(
                        "-i", inputPath.toAbsolutePath().toString(),
                        tempPng.toAbsolutePath().toString()
                ), 30);
                if (Files.exists(tempPng)) {
                    return ImageIO.read(tempPng.toFile());
                }
            } catch (Exception e) {
                log.warn("FFmpeg failed to read image {}: {}", inputPath, e.getMessage());
            } finally {
                Files.deleteIfExists(tempPng);
            }
        }

        return null;
    }

    private void writeTargetImage(BufferedImage image, String format, Path outputPath, Path originalInput) throws IOException {
        switch (format) {
            case "ico" -> writeIco(image, outputPath);
            case "svg" -> writeSvgWrapper(image, outputPath);
            case "avif" -> {
                if (ffmpegService.isAvailable()) {
                    Path tempPng = outputPath.getParent().resolve("tmp_" + outputPath.getFileName() + ".png");
                    ImageIO.write(image, "PNG", tempPng.toFile());
                    try {
                        ffmpegService.execute(List.of(
                                "-i", tempPng.toAbsolutePath().toString(),
                                outputPath.toAbsolutePath().toString()
                        ), 30);
                    } finally {
                        Files.deleteIfExists(tempPng);
                    }
                } else {
                    throw new ConversionException("AVIF encoding requires FFmpeg on the server.");
                }
            }
            case "jpg", "jpeg" -> {
                BufferedImage rgb = image;
                if (image.getColorModel().hasAlpha()) {
                    rgb = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
                    Graphics2D g = rgb.createGraphics();
                    g.setColor(Color.WHITE);
                    g.fillRect(0, 0, image.getWidth(), image.getHeight());
                    g.drawImage(image, 0, 0, null);
                    g.dispose();
                }
                boolean written = ImageIO.write(rgb, "JPEG", outputPath.toFile());
                if (!written && ffmpegService.isAvailable()) {
                    ffmpegService.execute(List.of("-i", originalInput.toAbsolutePath().toString(), outputPath.toAbsolutePath().toString()), 30);
                }
            }
            default -> {
                // PNG, WebP, TIFF, GIF, BMP
                boolean written = ImageIO.write(image, format, outputPath.toFile());
                if (!written && ffmpegService.isAvailable()) {
                    ffmpegService.execute(List.of("-i", originalInput.toAbsolutePath().toString(), outputPath.toAbsolutePath().toString()), 30);
                } else if (!written) {
                    throw new ConversionException("No encoder available for target format: " + format);
                }
            }
        }
    }

    private void writeIco(BufferedImage image, Path outputPath) throws IOException {
        int targetSize = Math.min(Math.max(image.getWidth(), image.getHeight()), 256);
        if (targetSize > 64) targetSize = 64; // standard clean ICO icon size
        if (targetSize < 16) targetSize = 16;

        BufferedImage scaled = new BufferedImage(targetSize, targetSize, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = scaled.createGraphics();
        g.drawImage(image, 0, 0, targetSize, targetSize, null);
        g.dispose();

        ByteArrayOutputStream pngOut = new ByteArrayOutputStream();
        ImageIO.write(scaled, "PNG", pngOut);
        byte[] pngBytes = pngOut.toByteArray();

        try (FileOutputStream fos = new FileOutputStream(outputPath.toFile())) {
            ByteBuffer buf = ByteBuffer.allocate(22);
            buf.order(ByteOrder.LITTLE_ENDIAN);
            buf.putShort((short) 0); // reserved
            buf.putShort((short) 1); // icon type
            buf.putShort((short) 1); // 1 image
            buf.put((byte) (targetSize == 256 ? 0 : targetSize));
            buf.put((byte) (targetSize == 256 ? 0 : targetSize));
            buf.put((byte) 0);
            buf.put((byte) 0);
            buf.putShort((short) 1);
            buf.putShort((short) 32);
            buf.putInt(pngBytes.length);
            buf.putInt(22);

            fos.write(buf.array());
            fos.write(pngBytes);
        }
    }

    private void writeSvgWrapper(BufferedImage image, Path outputPath) throws IOException {
        ByteArrayOutputStream pngOut = new ByteArrayOutputStream();
        ImageIO.write(image, "PNG", pngOut);
        String base64 = Base64.getEncoder().encodeToString(pngOut.toByteArray());

        String svgContent = String.format(
                "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"%d\" height=\"%d\" viewBox=\"0 0 %d %d\">\n" +
                        "  <image width=\"%d\" height=\"%d\" href=\"data:image/png;base64,%s\"/>\n" +
                        "</svg>",
                image.getWidth(), image.getHeight(), image.getWidth(), image.getHeight(),
                image.getWidth(), image.getHeight(), base64
        );

        Files.writeString(outputPath, svgContent, StandardCharsets.UTF_8);
    }

    private ConversionResult buildResult(Path outputPath, String outputFilename, String format) throws IOException {
        return ConversionResult.builder()
                .outputPath(outputPath)
                .filename(outputFilename)
                .contentType(getContentType(format))
                .fileSize(Files.size(outputPath))
                .isZip(false)
                .build();
    }

    private String getContentType(String format) {
        return switch (format.toLowerCase()) {
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "webp" -> "image/webp";
            case "avif" -> "image/avif";
            case "tiff" -> "image/tiff";
            case "svg" -> "image/svg+xml";
            case "ico" -> "image/x-icon";
            case "gif" -> "image/gif";
            default -> "application/octet-stream";
        };
    }
}
