package com.fileconverter.backend.converter;

import com.fileconverter.backend.exception.ConversionException;
import com.fileconverter.backend.model.ConversionOptions;
import com.fileconverter.backend.model.ConversionResult;
import org.apache.commons.io.FilenameUtils;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.sl.usermodel.PictureData;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFPictureData;
import org.apache.poi.xslf.usermodel.XSLFPictureShape;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xwpf.usermodel.ParagraphAlignment;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.Dimension;
import java.awt.geom.Rectangle2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;

@Component
public class PdfToDocumentConverter implements FileConverter {

    private static final Logger log = LoggerFactory.getLogger(PdfToDocumentConverter.class);
    private static final Set<String> SUPPORTED_TARGETS = Set.of("txt", "docx", "pptx");

    @Override
    public boolean canConvert(String sourceFormat, String targetFormat) {
        return "pdf".equalsIgnoreCase(sourceFormat) && SUPPORTED_TARGETS.contains(targetFormat.toLowerCase());
    }

    @Override
    public ConversionResult convert(Path inputFile, String targetFormat, Path outputDir, ConversionOptions options) {
        String baseName = FilenameUtils.getBaseName(inputFile.getFileName().toString());
        if (baseName.startsWith("input_") && baseName.length() > 14) {
            baseName = "document";
        }
        String outputFilename = baseName + "." + targetFormat.toLowerCase();
        Path outputPath = outputDir.resolve(outputFilename);
        String contentType;

        try {
            switch (targetFormat.toLowerCase()) {
                case "txt" -> {
                    convertPdfToTxt(inputFile, outputPath);
                    contentType = "text/plain";
                }
                case "docx" -> {
                    convertPdfToDocx(inputFile, outputPath);
                    contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                }
                case "pptx" -> {
                    convertPdfToPptx(inputFile, outputPath, options);
                    contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
                }
                default -> throw new ConversionException("Unsupported target format: " + targetFormat);
            }

            if (!Files.exists(outputPath) || Files.size(outputPath) == 0) {
                throw new ConversionException("Conversion produced an empty or missing output file.");
            }

            return ConversionResult.builder()
                    .outputPath(outputPath)
                    .filename(outputFilename)
                    .contentType(contentType)
                    .fileSize(Files.size(outputPath))
                    .isZip(false)
                    .build();
        } catch (Exception e) {
            log.error("Failed to convert PDF to {}: {}", targetFormat, e.getMessage(), e);
            throw new ConversionException("PDF to " + targetFormat.toUpperCase() + " conversion failed: " + e.getMessage(), e);
        }
    }

    private void convertPdfToTxt(Path inputFile, Path outputPath) throws IOException {
        try (PDDocument document = Loader.loadPDF(inputFile.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String text = stripper.getText(document);

            if (text == null || text.trim().isEmpty()) {
                // If text is empty (e.g. scanned PDF without OCR layer), provide a clear indication
                text = "[Notice: This PDF contains scanned images or non-selectable text. Text extraction yielded no characters.]";
            }

            Files.writeString(outputPath, text, StandardCharsets.UTF_8);
        }
    }

    private void convertPdfToDocx(Path inputFile, Path outputPath) throws IOException {
        try (PDDocument document = Loader.loadPDF(inputFile.toFile());
             XWPFDocument docx = new XWPFDocument()) {

            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);

            int numberOfPages = document.getNumberOfPages();
            for (int p = 1; p <= numberOfPages; p++) {
                stripper.setStartPage(p);
                stripper.setEndPage(p);
                String pageText = stripper.getText(document);

                if (pageText != null && !pageText.isBlank()) {
                    String[] paragraphs = pageText.split("\\r?\\n\\r?\\n");
                    for (String paraText : paragraphs) {
                        String clean = paraText.trim();
                        if (!clean.isEmpty()) {
                            XWPFParagraph para = docx.createParagraph();
                            para.setAlignment(ParagraphAlignment.LEFT);
                            para.setSpacingAfter(120);

                            XWPFRun run = para.createRun();
                            run.setFontFamily("Calibri");
                            run.setFontSize(11);
                            run.setText(clean.replaceAll("[\\r\\n]+", " "));
                        }
                    }
                }

                // Add page break between pages except the last
                if (p < numberOfPages) {
                    XWPFParagraph breakPara = docx.createParagraph();
                    breakPara.setPageBreak(true);
                }
            }

            try (FileOutputStream fos = new FileOutputStream(outputPath.toFile())) {
                docx.write(fos);
            }
        }
    }

    private void convertPdfToPptx(Path inputFile, Path outputPath, ConversionOptions options) throws IOException {
        try (PDDocument document = Loader.loadPDF(inputFile.toFile());
             XMLSlideShow pptx = new XMLSlideShow()) {

            PDFRenderer renderer = new PDFRenderer(document);
            int numberOfPages = document.getNumberOfPages();
            int dpi = options != null && options.getDpi() > 0 ? options.getDpi() : 150;

            for (int i = 0; i < numberOfPages; i++) {
                PDRectangle pageBox = document.getPage(i).getMediaBox();
                float widthPt = pageBox.getWidth();
                float heightPt = pageBox.getHeight();

                // Set PowerPoint slide dimension matching PDF page size
                pptx.setPageSize(new Dimension((int) widthPt, (int) heightPt));

                BufferedImage pageImage = renderer.renderImageWithDPI(i, dpi);
                ByteArrayOutputStream imgBytes = new ByteArrayOutputStream();
                ImageIO.write(pageImage, "PNG", imgBytes);

                XSLFSlide slide = pptx.createSlide();
                XSLFPictureData picData = pptx.addPicture(imgBytes.toByteArray(), PictureData.PictureType.PNG);
                XSLFPictureShape picShape = slide.createPicture(picData);
                picShape.setAnchor(new Rectangle2D.Double(0, 0, widthPt, heightPt));
            }

            try (FileOutputStream fos = new FileOutputStream(outputPath.toFile())) {
                pptx.write(fos);
            }
        }
    }
}
