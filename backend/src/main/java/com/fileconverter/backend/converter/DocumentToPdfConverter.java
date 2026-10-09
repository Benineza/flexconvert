package com.fileconverter.backend.converter;

import com.fileconverter.backend.exception.ConversionException;
import com.fileconverter.backend.model.ConversionOptions;
import com.fileconverter.backend.model.ConversionResult;
import com.fileconverter.backend.service.LibreOfficeService;
import org.apache.commons.io.FilenameUtils;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.awt.Dimension;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Component
public class DocumentToPdfConverter implements FileConverter {

    private static final Logger log = LoggerFactory.getLogger(DocumentToPdfConverter.class);
    private static final Set<String> SUPPORTED_INPUTS = Set.of("txt", "docx", "pptx");

    private final LibreOfficeService libreOfficeService;

    public DocumentToPdfConverter(LibreOfficeService libreOfficeService) {
        this.libreOfficeService = libreOfficeService;
    }

    @Override
    public boolean canConvert(String sourceFormat, String targetFormat) {
        return SUPPORTED_INPUTS.contains(sourceFormat.toLowerCase()) && "pdf".equalsIgnoreCase(targetFormat);
    }

    @Override
    public ConversionResult convert(Path inputFile, String targetFormat, Path outputDir, ConversionOptions options) {
        String ext = FilenameUtils.getExtension(inputFile.getFileName().toString()).toLowerCase();
        String baseName = FilenameUtils.getBaseName(inputFile.getFileName().toString());
        // Clean out internal "input_uuid" prefix if present
        if (baseName.startsWith("input_") && baseName.length() > 14) {
            baseName = "document";
        }
        String outputFilename = baseName + ".pdf";
        Path outputPath = outputDir.resolve(outputFilename);

        try {
            switch (ext) {
                case "txt" -> convertTxtToPdf(inputFile, outputPath);
                case "docx" -> convertDocxToPdf(inputFile, outputPath, outputDir);
                case "pptx" -> convertPptxToPdf(inputFile, outputPath, outputDir);
                default -> throw new ConversionException("Unsupported document input type: " + ext);
            }

            if (!Files.exists(outputPath) || Files.size(outputPath) == 0) {
                throw new ConversionException("Conversion failed: output PDF file is missing or empty.");
            }

            return ConversionResult.builder()
                    .outputPath(outputPath)
                    .filename(outputFilename)
                    .contentType("application/pdf")
                    .fileSize(Files.size(outputPath))
                    .isZip(false)
                    .build();
        } catch (Exception e) {
            log.error("Failed to convert document {} to PDF: {}", inputFile, e.getMessage(), e);
            throw new ConversionException("Document to PDF conversion failed: " + e.getMessage(), e);
        }
    }

    private void convertTxtToPdf(Path inputFile, Path outputPath) throws IOException {
        try (PDDocument document = new PDDocument();
             BufferedReader reader = Files.newBufferedReader(inputFile, StandardCharsets.UTF_8)) {

            PDFont font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            float fontSize = 11;
            float leading = 15;
            float margin = 50;

            PDRectangle mediabox = PDRectangle.A4;
            float width = mediabox.getWidth() - 2 * margin;
            float startX = margin;
            float startY = mediabox.getHeight() - margin;

            PDPage page = new PDPage(mediabox);
            document.addPage(page);
            PDPageContentStream content = new PDPageContentStream(document, page);
            content.setFont(font, fontSize);
            content.beginText();
            content.newLineAtOffset(startX, startY);

            float currentY = startY;
            String line;

            while ((line = reader.readLine()) != null) {
                // Handle empty line
                if (line.trim().isEmpty()) {
                    currentY -= leading;
                    if (currentY <= margin) {
                        content.endText();
                        content.close();

                        page = new PDPage(mediabox);
                        document.addPage(page);
                        content = new PDPageContentStream(document, page);
                        content.setFont(font, fontSize);
                        content.beginText();
                        content.newLineAtOffset(startX, startY);
                        currentY = startY;
                    } else {
                        content.newLineAtOffset(0, -leading);
                    }
                    continue;
                }

                // Word wrap
                List<String> wrappedLines = wrapText(line, font, fontSize, width);
                for (String wrappedLine : wrappedLines) {
                    currentY -= leading;
                    if (currentY <= margin) {
                        content.endText();
                        content.close();

                        page = new PDPage(mediabox);
                        document.addPage(page);
                        content = new PDPageContentStream(document, page);
                        content.setFont(font, fontSize);
                        content.beginText();
                        content.newLineAtOffset(startX, startY);
                        currentY = startY;
                    } else {
                        content.newLineAtOffset(0, -leading);
                    }
                    content.showText(sanitizeText(wrappedLine));
                }
            }

            content.endText();
            content.close();
            document.save(outputPath.toFile());
        }
    }

    private void convertDocxToPdf(Path inputFile, Path outputPath, Path outputDir) throws IOException {
        // Try LibreOffice first if available
        if (libreOfficeService.isAvailable()) {
            try {
                libreOfficeService.convertToPdf(inputFile, outputDir, 60);
                String libreOfficeOutputName = FilenameUtils.getBaseName(inputFile.getFileName().toString()) + ".pdf";
                Path generatedPdf = outputDir.resolve(libreOfficeOutputName);
                if (Files.exists(generatedPdf)) {
                    if (!generatedPdf.equals(outputPath)) {
                        Files.move(generatedPdf, outputPath);
                    }
                    return;
                }
            } catch (Exception e) {
                log.warn("LibreOffice conversion failed, falling back to pure Java DOCX engine: {}", e.getMessage());
            }
        }

        // Pure Java DOCX -> PDF conversion using Apache POI and PDFBox
        try (InputStream is = Files.newInputStream(inputFile);
             XWPFDocument docx = new XWPFDocument(is);
             PDDocument pdfDoc = new PDDocument()) {

            PDFont fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDFont fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

            PDRectangle mediabox = PDRectangle.A4;
            float margin = 54;
            float width = mediabox.getWidth() - (2 * margin);
            float startY = mediabox.getHeight() - margin;
            float currentY = startY;

            PDPage page = new PDPage(mediabox);
            pdfDoc.addPage(page);
            PDPageContentStream content = new PDPageContentStream(pdfDoc, page);

            // Process paragraphs
            for (XWPFParagraph para : docx.getParagraphs()) {
                String text = para.getText();
                if (text == null || text.trim().isEmpty()) {
                    currentY -= 12;
                    continue;
                }

                boolean isBold = false;
                for (XWPFRun run : para.getRuns()) {
                    if (run.isBold()) {
                        isBold = true;
                        break;
                    }
                }

                PDFont font = isBold ? fontBold : fontRegular;
                float fontSize = isBold ? 12f : 10.5f;
                float leading = fontSize + 4;

                List<String> wrapped = wrapText(text, font, fontSize, width);
                for (String line : wrapped) {
                    if (currentY - leading < margin) {
                        content.close();
                        page = new PDPage(mediabox);
                        pdfDoc.addPage(page);
                        content = new PDPageContentStream(pdfDoc, page);
                        currentY = startY;
                    }

                    content.beginText();
                    content.setFont(font, fontSize);
                    content.newLineAtOffset(margin, currentY);
                    content.showText(sanitizeText(line));
                    content.endText();

                    currentY -= leading;
                }
                currentY -= 6; // paragraph spacing
            }

            // Process tables if present
            for (XWPFTable table : docx.getTables()) {
                for (XWPFTableRow row : table.getRows()) {
                    StringBuilder rowText = new StringBuilder();
                    for (XWPFTableCell cell : row.getTableCells()) {
                        rowText.append(cell.getText().trim()).append("  |  ");
                    }
                    if (currentY - 14 < margin) {
                        content.close();
                        page = new PDPage(mediabox);
                        pdfDoc.addPage(page);
                        content = new PDPageContentStream(pdfDoc, page);
                        currentY = startY;
                    }
                    content.beginText();
                    content.setFont(fontRegular, 9.5f);
                    content.newLineAtOffset(margin, currentY);
                    content.showText(sanitizeText(rowText.toString()));
                    content.endText();
                    currentY -= 14;
                }
                currentY -= 8;
            }

            content.close();
            pdfDoc.save(outputPath.toFile());
        }
    }

    private void convertPptxToPdf(Path inputFile, Path outputPath, Path outputDir) throws IOException {
        // Try LibreOffice first if available
        if (libreOfficeService.isAvailable()) {
            try {
                libreOfficeService.convertToPdf(inputFile, outputDir, 60);
                String libreOfficeOutputName = FilenameUtils.getBaseName(inputFile.getFileName().toString()) + ".pdf";
                Path generatedPdf = outputDir.resolve(libreOfficeOutputName);
                if (Files.exists(generatedPdf)) {
                    if (!generatedPdf.equals(outputPath)) {
                        Files.move(generatedPdf, outputPath);
                    }
                    return;
                }
            } catch (Exception e) {
                log.warn("LibreOffice conversion failed, falling back to pure Java PPTX engine: {}", e.getMessage());
            }
        }

        // Pure Java PPTX -> PDF rendering each slide to image then embedding in PDFBox
        try (InputStream is = Files.newInputStream(inputFile);
             XMLSlideShow ppt = new XMLSlideShow(is);
             PDDocument pdfDoc = new PDDocument()) {

            Dimension pgsize = ppt.getPageSize();
            List<XSLFSlide> slides = ppt.getSlides();

            if (slides.isEmpty()) {
                throw new ConversionException("The presentation does not contain any slides.");
            }

            for (XSLFSlide slide : slides) {
                BufferedImage img = new BufferedImage(pgsize.width, pgsize.height, BufferedImage.TYPE_INT_RGB);
                Graphics2D graphics = img.createGraphics();
                graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
                graphics.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
                graphics.setPaint(Color.WHITE);
                graphics.fillRect(0, 0, pgsize.width, pgsize.height);

                slide.draw(graphics);
                graphics.dispose();

                PDPage page = new PDPage(new PDRectangle(pgsize.width, pgsize.height));
                pdfDoc.addPage(page);

                PDImageXObject pdImage = LosslessFactory.createFromImage(pdfDoc, img);
                try (PDPageContentStream content = new PDPageContentStream(pdfDoc, page)) {
                    content.drawImage(pdImage, 0, 0, pgsize.width, pgsize.height);
                }
            }

            pdfDoc.save(outputPath.toFile());
        }
    }

    private List<String> wrapText(String text, PDFont font, float fontSize, float maxWidth) throws IOException {
        List<String> lines = new ArrayList<>();
        String[] words = text.split("\\s+");
        StringBuilder currentLine = new StringBuilder();

        for (String word : words) {
            String candidate = currentLine.length() == 0 ? word : currentLine + " " + word;
            float stringWidth = font.getStringWidth(sanitizeText(candidate)) / 1000f * fontSize;
            if (stringWidth <= maxWidth) {
                currentLine.setLength(0);
                currentLine.append(candidate);
            } else {
                if (currentLine.length() > 0) {
                    lines.add(currentLine.toString());
                    currentLine.setLength(0);
                    currentLine.append(word);
                } else {
                    // Single word exceeds width, add as is
                    lines.add(word);
                }
            }
        }
        if (currentLine.length() > 0) {
            lines.add(currentLine.toString());
        }
        return lines;
    }

    private String sanitizeText(String text) {
        if (text == null) return "";
        // Replace non-printable / control characters that PDFBox Standard 14 fonts cannot encode
        return text.replaceAll("[\\r\\n\\t]", " ")
                .replaceAll("[^\\x20-\\x7E]", "?");
    }
}
