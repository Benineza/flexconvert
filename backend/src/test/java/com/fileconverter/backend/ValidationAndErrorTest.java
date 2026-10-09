package com.fileconverter.backend;

import com.fileconverter.backend.controller.ConversionController;
import com.fileconverter.backend.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class ValidationAndErrorTest {

    @Autowired
    private ConversionController conversionController;

    @Autowired
    private GlobalExceptionHandler globalExceptionHandler;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(conversionController)
                .setControllerAdvice(globalExceptionHandler)
                .build();
    }

    @Test
    void testUnsupportedConversionReturnsBadRequest() throws Exception {
        MockMultipartFile videoFile = new MockMultipartFile(
                "file",
                "sample.mp4",
                "video/mp4",
                new byte[]{0x00, 0x00, 0x00, 0x18, 'f', 't', 'y', 'p'}
        );

        mockMvc.perform(multipart("/api/convert")
                        .file(videoFile)
                        .param("targetFormat", "pdf"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("UNSUPPORTED_CONVERSION"));
    }

    @Test
    void testEmptyFileReturnsBadRequest() throws Exception {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file",
                "empty.txt",
                "text/plain",
                new byte[0]
        );

        mockMvc.perform(multipart("/api/convert")
                        .file(emptyFile)
                        .param("targetFormat", "pdf"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("INVALID_FILE"));
    }

    @Test
    void testSameFormatReturnsBadRequest() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.pdf",
                "application/pdf",
                new byte[]{1, 2, 3}
        );

        mockMvc.perform(multipart("/api/convert")
                        .file(file)
                        .param("targetFormat", "pdf"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("INVALID_FILE"));
    }
}
