package com.fileconverter.backend.converter;

import com.fileconverter.backend.exception.ConversionException;
import com.fileconverter.backend.model.ConversionOptions;
import com.fileconverter.backend.model.ConversionResult;
import com.fileconverter.backend.service.FfmpegService;
import org.apache.batik.transcoder.TranscoderInput;
import org.apache.batik.transcoder.TranscoderOutput;
import org.apache.batik.transcoder.image.PNGTranscoder;
import org.apache.commons.io.FilenameUtils;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;

@Component
public class ImageToPdfConverter implements FileConverter {

    private static final Logger log = LoggerFactory.getLogger(ImageToPdfConverter.class);
    private static final Set<String> SUPPORTED_IMAGE_INPUTS = Set.of(
            "png", "jpg", "jpeg", "webp", "avif", "tiff", "svg", "ico", "gif"
    );

    private final FfmpegService ffmpegService;

    public ImageToPdfConverter(FfmpegService ffmpegService) {
        this.ffmpegService = ffmpegService;
    }

    @Override
    public boolean canConvert(String sourceFormat, String targetFormat) {
        return SUPPORTED_IMAGE_INPUTS.contains(sourceFormat.toLowerCase()) && "pdf".equalsIgnoreCase(targetFormat);
    }

    @Override
    public ConversionResult convert(Path inputFile, String targetFormat, Path outputDir, ConversionOptions options) {
        return convertMultiple(List.of(inputFile), outputDir, options);
    }

    public ConversionResult convertMultiple(List<Path> inputFiles, Path outputDir, ConversionOptions options) {
        String baseName = "compiled_images";
        if (inputFiles.size() == 1) {
            String name = FilenameUtils.getBaseName(inputFiles.get(0).getFileName().toString());
            if (!name.startsWith("input_")) {
                baseName = name;
            }
        }
        String outputFilename = baseName + ".pdf";
        Path outputPath = outputDir.resolve(outputFilename);

        try (PDDocument document = new PDDocument()) {
            PDRectangle pageSize = resolvePageSize(options);

            for (Path imgFile : inputFiles) {
                BufferedImage image = readImage(imgFile);
                if (image == null) {
                    log.warn("Skipping unreadable image file: {}", imgFile);
                    continue;
                }

                PDPage page = new PDPage(pageSize);
                document.addPage(page);

                PDImageXObject pdImage = LosslessFactory.createFromImage(document, image);
                drawImageOnPage(document, page, pdImage, image.getWidth(), image.getHeight(), options);
            }

            if (document.getNumberOfPages() == 0) {
                throw new ConversionException("Could not read any valid image to create PDF.");
            }

            document.save(outputPath.toFile());

            return ConversionResult.builder()
                    .outputPath(outputPath)
                    .filename(outputFilename)
                    .contentType("application/pdf")
                    .fileSize(Files.size(outputPath))
                    .isZip(false)
                    .build();

        } catch (Exception e) {
            log.error("Failed to compile images to PDF: {}", e.getMessage(), e);
            throw new ConversionException("Image to PDF conversion failed: " + e.getMessage(), e);
        }
    }

    private BufferedImage readImage(Path imgPath) throws IOException {
        String ext = FilenameUtils.getExtension(imgPath.getFileName().toString()).toLowerCase();

        // 1. Handle SVG using Apache Batik Transcoder
        if ("svg".equalsIgnoreCase(ext)) {
            try (InputStream is = Files.newInputStream(imgPath);
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

        // 2. Try standard ImageIO (handles PNG, JPG, WebP, TIFF, GIF, BMP)
        BufferedImage img = ImageIO.read(imgPath.toFile());
        if (img != null) {
            return img;
        }

        // 3. Fallback for AVIF or formats ImageIO failed to read: use FFmpeg to transcode to PNG
        if (ffmpegService.isAvailable()) {
            Path tempPng = imgPath.getParent().resolve("tmp_read_" + imgPath.getFileName() + ".png");
            try {
                ffmpegService.execute(List.of(
                        "-i", imgPath.toAbsolutePath().toString(),
                        tempPng.toAbsolutePath().toString()
                ), 30);
                if (Files.exists(tempPng)) {
                    return ImageIO.read(tempPng.toFile());
                }
            } catch (Exception e) {
                log.warn("FFmpeg failed to read image {}: {}", imgPath, e.getMessage());
            } finally {
                Files.deleteIfExists(tempPng);
            }
        }

        return null;
    }

    private PDRectangle resolvePageSize(ConversionOptions options) {
        String size = options != null && options.getPageSize() != null ? options.getPageSize().toLowerCase() : "a4";
        PDRectangle rect = "letter".equals(size) ? PDRectangle.LETTER : PDRectangle.A4;

        String orientation = options != null && options.getOrientation() != null ? options.getOrientation().toLowerCase() : "portrait";
        if ("landscape".equals(orientation)) {
            return new PDRectangle(rect.getHeight(), rect.getWidth());
        }
        return rect;
    }

    private void drawImageOnPage(PDDocument doc, PDPage page, PDImageXObject pdImage, int imgWidth, int imgHeight, ConversionOptions options) throws IOException {
        PDRectangle mediaBox = page.getMediaBox();
        float pageWidth = mediaBox.getWidth();
        float pageHeight = mediaBox.getHeight();
        float margin = 20f;
        float printableWidth = pageWidth - (2 * margin);
        float printableHeight = pageHeight - (2 * margin);

        String fit = options != null && options.getImageFit() != null ? options.getImageFit().toLowerCase() : "fit";

        float drawWidth;
        float drawHeight;
        float drawX;
        float drawY;

        switch (fit) {
            case "stretch" -> {
                drawWidth = printableWidth;
                drawHeight = printableHeight;
                drawX = margin;
                drawY = margin;
            }
            case "original" -> {
                drawWidth = Math.min(imgWidth, printableWidth);
                drawHeight = Math.min(imgHeight, printableHeight);
                drawX = margin + (printableWidth - drawWidth) / 2f;
                drawY = margin + (printableHeight - drawHeight) / 2f;
            }
            case "fit" -> {
                float scale = Math.min(printableWidth / imgWidth, printableHeight / imgHeight);
                drawWidth = imgWidth * scale;
                drawHeight = imgHeight * scale;
                drawX = margin + (printableWidth - drawWidth) / 2f;
                drawY = margin + (printableHeight - drawHeight) / 2f;
            }
            default -> {
                float scale = Math.min(printableWidth / imgWidth, printableHeight / imgHeight);
                drawWidth = imgWidth * scale;
                drawHeight = imgHeight * scale;
                drawX = margin + (printableWidth - drawWidth) / 2f;
                drawY = margin + (printableHeight - drawHeight) / 2f;
            }
        }

        try (PDPageContentStream content = new PDPageContentStream(doc, page)) {
            content.drawImage(pdImage, drawX, drawY, drawWidth, drawHeight);
        }
    }
}
