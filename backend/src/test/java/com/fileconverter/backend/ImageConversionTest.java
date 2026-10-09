package com.fileconverter.backend;

import com.fileconverter.backend.converter.DocumentToPdfConverter;
import com.fileconverter.backend.converter.ImageConverter;
import com.fileconverter.backend.converter.ImageToPdfConverter;
import com.fileconverter.backend.converter.PdfToImageConverter;
import com.fileconverter.backend.model.ConversionOptions;
import com.fileconverter.backend.model.ConversionResult;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.zip.ZipFile;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class ImageConversionTest {

    @Autowired
    private ImageConverter imageConverter;

    @Autowired
    private ImageToPdfConverter imageToPdfConverter;

    @Autowired
    private PdfToImageConverter pdfToImageConverter;

    @Autowired
    private DocumentToPdfConverter documentToPdfConverter;

    @TempDir
    Path tempDir;

    private Path createSampleImage(String name, String format, Color color) throws Exception {
        Path path = tempDir.resolve(name);
        boolean isRgbOnly = "jpg".equalsIgnoreCase(format) || "jpeg".equalsIgnoreCase(format);
        BufferedImage img = new BufferedImage(100, 100, isRgbOnly ? BufferedImage.TYPE_INT_RGB : BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setColor(color);
        g.fillRect(0, 0, 100, 100);
        g.setColor(Color.WHITE);
        g.drawString("Test", 35, 55);
        g.dispose();
        ImageIO.write(img, format, path.toFile());
        return path;
    }

    @Test
    void testImageToImageConversions() throws Exception {
        Path pngFile = createSampleImage("test.png", "PNG", Color.BLUE);
        Path outDir = tempDir.resolve("out_images");
        Files.createDirectories(outDir);

        // 1. PNG -> JPG
        ConversionResult jpgResult = imageConverter.convert(pngFile, "jpg", outDir, new ConversionOptions());
        assertThat(jpgResult.getOutputPath()).exists();
        assertThat(jpgResult.getContentType()).isEqualTo("image/jpeg");
        BufferedImage readJpg = ImageIO.read(jpgResult.getOutputPath().toFile());
        assertThat(readJpg).isNotNull();

        // 2. JPG -> PNG
        ConversionResult pngResult = imageConverter.convert(jpgResult.getOutputPath(), "png", outDir, new ConversionOptions());
        assertThat(pngResult.getOutputPath()).exists();
        assertThat(pngResult.getContentType()).isEqualTo("image/png");

        // 3. PNG -> WebP
        ConversionResult webpResult = imageConverter.convert(pngFile, "webp", outDir, new ConversionOptions());
        assertThat(webpResult.getOutputPath()).exists();
        assertThat(webpResult.getContentType()).isEqualTo("image/webp");

        // 4. PNG -> TIFF
        ConversionResult tiffResult = imageConverter.convert(pngFile, "tiff", outDir, new ConversionOptions());
        assertThat(tiffResult.getOutputPath()).exists();
        assertThat(tiffResult.getContentType()).isEqualTo("image/tiff");
    }

    @Test
    void testMultipleImagesToPdf() throws Exception {
        Path img1 = createSampleImage("page1.png", "PNG", Color.RED);
        Path img2 = createSampleImage("page2.jpg", "JPEG", Color.GREEN);
        Path outDir = tempDir.resolve("out_multi_pdf");
        Files.createDirectories(outDir);

        ConversionResult pdfResult = imageToPdfConverter.convertMultiple(List.of(img1, img2), outDir, new ConversionOptions());

        assertThat(pdfResult.getOutputPath()).exists();
        assertThat(pdfResult.getContentType()).isEqualTo("application/pdf");

        try (PDDocument doc = Loader.loadPDF(pdfResult.getOutputPath().toFile())) {
            assertThat(doc.getNumberOfPages()).isEqualTo(2);
        }
    }

    @Test
    void testPdfToImagesZipPackaging() throws Exception {
        // Create a 2-page PDF
        Path txt = tempDir.resolve("long_text.txt");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 80; i++) {
            sb.append("This is line number ").append(i).append(" for multiple pages in PDFBox document.\n");
        }
        Files.writeString(txt, sb.toString(), StandardCharsets.UTF_8);

        Path pdfDir = tempDir.resolve("pdf_source_long");
        Files.createDirectories(pdfDir);
        ConversionResult pdf = documentToPdfConverter.convert(txt, "pdf", pdfDir, new ConversionOptions());

        Path outDir = tempDir.resolve("out_pdf_images");
        Files.createDirectories(outDir);

        ConversionResult result = pdfToImageConverter.convert(pdf.getOutputPath(), "png", outDir, new ConversionOptions());

        assertThat(result.getOutputPath()).exists();
        if (result.isZip()) {
            assertThat(result.getContentType()).isEqualTo("application/zip");
            try (ZipFile zip = new ZipFile(result.getOutputPath().toFile())) {
                assertThat(zip.size()).isGreaterThanOrEqualTo(2);
            }
        } else {
            assertThat(result.getContentType()).isEqualTo("image/png");
        }
    }
}
