package com.fileconverter.backend.converter;

import com.fileconverter.backend.exception.ConversionException;
import com.fileconverter.backend.model.ConversionOptions;
import com.fileconverter.backend.model.ConversionResult;
import com.fileconverter.backend.service.FfmpegService;
import org.apache.commons.io.FilenameUtils;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Component
public class PdfToImageConverter implements FileConverter {

    private static final Logger log = LoggerFactory.getLogger(PdfToImageConverter.class);
    private static final Set<String> SUPPORTED_IMAGE_TARGETS = Set.of("png", "jpg", "jpeg", "webp", "avif", "tiff");

    private final FfmpegService ffmpegService;

    public PdfToImageConverter(FfmpegService ffmpegService) {
        this.ffmpegService = ffmpegService;
    }

    @Override
    public boolean canConvert(String sourceFormat, String targetFormat) {
        return "pdf".equalsIgnoreCase(sourceFormat) && SUPPORTED_IMAGE_TARGETS.contains(targetFormat.toLowerCase());
    }

    @Override
    public ConversionResult convert(Path inputFile, String targetFormat, Path outputDir, ConversionOptions options) {
        String baseName = FilenameUtils.getBaseName(inputFile.getFileName().toString());
        if (baseName.startsWith("input_") && baseName.length() > 14) {
            baseName = "document";
        }
        String format = targetFormat.toLowerCase();
        int dpi = options != null && options.getDpi() > 0 ? options.getDpi() : 150;

        try (PDDocument document = Loader.loadPDF(inputFile.toFile())) {
            int totalPages = document.getNumberOfPages();
            if (totalPages == 0) {
                throw new ConversionException("The PDF document does not contain any pages.");
            }

            int startPage = 0;
            int endPage = totalPages - 1;

            if (options != null && "range".equalsIgnoreCase(options.getPageSelection())) {
                startPage = Math.max(0, options.getPageStart() - 1);
                endPage = Math.min(totalPages - 1, options.getPageEnd() - 1);
                if (startPage > endPage) {
                    int temp = startPage;
                    startPage = endPage;
                    endPage = temp;
                }
            }

            PDFRenderer renderer = new PDFRenderer(document);
            List<Path> generatedImages = new ArrayList<>();

            for (int pageIndex = startPage; pageIndex <= endPage; pageIndex++) {
                int pageNumber = pageIndex + 1;
                BufferedImage image = renderer.renderImageWithDPI(pageIndex, dpi);
                String pageFileName = String.format("%s_page_%d.%s", baseName, pageNumber, format);
                Path pageOutPath = outputDir.resolve(pageFileName);

                writeImage(image, format, pageOutPath);
                generatedImages.add(pageOutPath);
            }

            if (generatedImages.isEmpty()) {
                throw new ConversionException("No images were generated from the selected PDF pages.");
            }

            // If only 1 image was generated, return single file directly
            if (generatedImages.size() == 1) {
                Path singleImg = generatedImages.get(0);
                String finalName = baseName + "." + format;
                Path finalPath = outputDir.resolve(finalName);
                if (!singleImg.equals(finalPath)) {
                    Files.move(singleImg, finalPath);
                }

                return ConversionResult.builder()
                        .outputPath(finalPath)
                        .filename(finalName)
                        .contentType(getContentType(format))
                        .fileSize(Files.size(finalPath))
                        .isZip(false)
                        .build();
            }

            // Multi-page PDF: Package all generated pages into a ZIP archive
            String zipName = String.format("%s_%s_pages.zip", baseName, format);
            Path zipPath = outputDir.resolve(zipName);

            try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(zipPath.toFile()))) {
                for (Path imgPath : generatedImages) {
                    File imgFile = imgPath.toFile();
                    zos.putNextEntry(new ZipEntry(imgFile.getName()));
                    try (FileInputStream fis = new FileInputStream(imgFile)) {
                        fis.transferTo(zos);
                    }
                    zos.closeEntry();
                    // Clean up individual page file after adding to ZIP
                    Files.deleteIfExists(imgPath);
                }
            }

            return ConversionResult.builder()
                    .outputPath(zipPath)
                    .filename(zipName)
                    .contentType("application/zip")
                    .fileSize(Files.size(zipPath))
                    .isZip(true)
                    .build();

        } catch (Exception e) {
            log.error("Failed to convert PDF pages to images: {}", e.getMessage(), e);
            throw new ConversionException("PDF to image conversion failed: " + e.getMessage(), e);
        }
    }

    private void writeImage(BufferedImage image, String format, Path destination) throws IOException {
        // Standard formats handled directly by ImageIO (with TwelveMonkeys plugins)
        if ("png".equalsIgnoreCase(format) || "jpg".equalsIgnoreCase(format) || "jpeg".equalsIgnoreCase(format) || "tiff".equalsIgnoreCase(format) || "webp".equalsIgnoreCase(format)) {
            // For JPEG, convert to RGB if image has alpha
            BufferedImage toWrite = image;
            if (("jpg".equalsIgnoreCase(format) || "jpeg".equalsIgnoreCase(format)) && image.getColorModel().hasAlpha()) {
                toWrite = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
                toWrite.createGraphics().drawImage(image, 0, 0, java.awt.Color.WHITE, null);
            }
            boolean success = ImageIO.write(toWrite, format, destination.toFile());
            if (success) {
                return;
            }
        }

        // If ImageIO could not write or if format is AVIF: use FFmpeg via intermediate PNG
        if (ffmpegService.isAvailable()) {
            Path tempPng = destination.getParent().resolve("tmp_" + destination.getFileName() + ".png");
            ImageIO.write(image, "PNG", tempPng.toFile());
            try {
                ffmpegService.execute(List.of(
                        "-i", tempPng.toAbsolutePath().toString(),
                        destination.toAbsolutePath().toString()
                ), 30);
                return;
            } finally {
                Files.deleteIfExists(tempPng);
            }
        }

        throw new ConversionException("No suitable image encoder available for format: " + format);
    }

    private String getContentType(String format) {
        return switch (format.toLowerCase()) {
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "webp" -> "image/webp";
            case "avif" -> "image/avif";
            case "tiff" -> "image/tiff";
            default -> "application/octet-stream";
        };
    }
}
