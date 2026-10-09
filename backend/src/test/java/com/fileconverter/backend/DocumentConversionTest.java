package com.fileconverter.backend;

import com.fileconverter.backend.converter.DocumentToPdfConverter;
import com.fileconverter.backend.converter.PdfToDocumentConverter;
import com.fileconverter.backend.model.ConversionOptions;
import com.fileconverter.backend.model.ConversionResult;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFTextBox;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class DocumentConversionTest {

    @Autowired
    private DocumentToPdfConverter documentToPdfConverter;

    @Autowired
    private PdfToDocumentConverter pdfToDocumentConverter;

    @TempDir
    Path tempDir;

    @Test
    void testTxtToPdfConversion() throws Exception {
        Path txtFile = tempDir.resolve("sample.txt");
        String content = "Hello World!\nThis is a real text file being converted to PDF.\nIt supports multiple lines and paragraphs.";
        Files.writeString(txtFile, content, StandardCharsets.UTF_8);

        Path outDir = tempDir.resolve("out_txt_pdf");
        Files.createDirectories(outDir);

        ConversionResult result = documentToPdfConverter.convert(txtFile, "pdf", outDir, new ConversionOptions());

        assertThat(result).isNotNull();
        assertThat(result.getOutputPath()).exists();
        assertThat(result.getFileSize()).isGreaterThan(0);
        assertThat(result.getContentType()).isEqualTo("application/pdf");

        // Verify that the generated file is a valid PDF containing the text
        try (PDDocument doc = Loader.loadPDF(result.getOutputPath().toFile())) {
            assertThat(doc.getNumberOfPages()).isGreaterThanOrEqualTo(1);
            String extracted = new PDFTextStripper().getText(doc);
            assertThat(extracted).contains("Hello World");
        }
    }

    @Test
    void testDocxToPdfConversion() throws Exception {
        Path docxFile = tempDir.resolve("sample.docx");
        try (XWPFDocument docx = new XWPFDocument();
             FileOutputStream fos = new FileOutputStream(docxFile.toFile())) {
            XWPFParagraph p = docx.createParagraph();
            XWPFRun run = p.createRun();
            run.setText("Sample Heading for DOCX Conversion");
            run.setBold(true);
            docx.write(fos);
        }

        Path outDir = tempDir.resolve("out_docx_pdf");
        Files.createDirectories(outDir);

        ConversionResult result = documentToPdfConverter.convert(docxFile, "pdf", outDir, new ConversionOptions());

        assertThat(result).isNotNull();
        assertThat(result.getOutputPath()).exists();
        assertThat(result.getFileSize()).isGreaterThan(0);

        try (PDDocument doc = Loader.loadPDF(result.getOutputPath().toFile())) {
            assertThat(doc.getNumberOfPages()).isGreaterThanOrEqualTo(1);
        }
    }

    @Test
    void testPptxToPdfConversion() throws Exception {
        Path pptxFile = tempDir.resolve("sample.pptx");
        try (XMLSlideShow ppt = new XMLSlideShow();
             FileOutputStream fos = new FileOutputStream(pptxFile.toFile())) {
            XSLFSlide slide1 = ppt.createSlide();
            XSLFTextBox text1 = slide1.createTextBox();
            text1.setText("Slide 1 Content");

            XSLFSlide slide2 = ppt.createSlide();
            XSLFTextBox text2 = slide2.createTextBox();
            text2.setText("Slide 2 Content");

            ppt.write(fos);
        }

        Path outDir = tempDir.resolve("out_pptx_pdf");
        Files.createDirectories(outDir);

        ConversionResult result = documentToPdfConverter.convert(pptxFile, "pdf", outDir, new ConversionOptions());

        assertThat(result).isNotNull();
        assertThat(result.getOutputPath()).exists();
        assertThat(result.getFileSize()).isGreaterThan(0);

        try (PDDocument doc = Loader.loadPDF(result.getOutputPath().toFile())) {
            assertThat(doc.getNumberOfPages()).isEqualTo(2);
        }
    }

    @Test
    void testPdfToTxtDocxPptxConversion() throws Exception {
        // First generate a real PDF
        Path txtFile = tempDir.resolve("input_for_pdf.txt");
        Files.writeString(txtFile, "First Page Header\nSome body text for document testing.", StandardCharsets.UTF_8);
        Path pdfDir = tempDir.resolve("pdf_source");
        Files.createDirectories(pdfDir);
        ConversionResult pdfResult = documentToPdfConverter.convert(txtFile, "pdf", pdfDir, new ConversionOptions());

        Path outDir = tempDir.resolve("pdf_exports");
        Files.createDirectories(outDir);

        // 1. PDF -> TXT
        ConversionResult txtResult = pdfToDocumentConverter.convert(pdfResult.getOutputPath(), "txt", outDir, new ConversionOptions());
        assertThat(txtResult.getOutputPath()).exists();
        String txtContent = Files.readString(txtResult.getOutputPath());
        assertThat(txtContent).contains("First Page Header");

        // 2. PDF -> DOCX
        ConversionResult docxResult = pdfToDocumentConverter.convert(pdfResult.getOutputPath(), "docx", outDir, new ConversionOptions());
        assertThat(docxResult.getOutputPath()).exists();
        try (InputStream is = Files.newInputStream(docxResult.getOutputPath());
             XWPFDocument docx = new XWPFDocument(is)) {
            assertThat(docx.getParagraphs()).isNotEmpty();
        }

        // 3. PDF -> PPTX
        ConversionResult pptxResult = pdfToDocumentConverter.convert(pdfResult.getOutputPath(), "pptx", outDir, new ConversionOptions());
        assertThat(pptxResult.getOutputPath()).exists();
        try (InputStream is = Files.newInputStream(pptxResult.getOutputPath());
             XMLSlideShow pptx = new XMLSlideShow(is)) {
            assertThat(pptx.getSlides()).isNotEmpty();
        }
    }
}
