package com.fileconverter.backend;

import com.fileconverter.backend.converter.VideoConverter;
import com.fileconverter.backend.model.ConversionOptions;
import com.fileconverter.backend.model.ConversionResult;
import com.fileconverter.backend.service.FfmpegService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

@SpringBootTest
class VideoConversionTest {

    @Autowired
    private VideoConverter videoConverter;

    @Autowired
    private FfmpegService ffmpegService;

    @TempDir
    Path tempDir;

    @Test
    void testMp4ToWebmConversion() throws Exception {
        assumeTrue(ffmpegService.isAvailable(), "FFmpeg must be available for video testing");

        Path sampleMp4 = tempDir.resolve("sample.mp4");
        // Generate a 1-second synthetic MP4 video
        ffmpegService.execute(List.of(
                "-f", "lavfi",
                "-i", "testsrc=duration=1:size=160x120:rate=10",
                "-f", "lavfi",
                "-i", "sine=frequency=1000:duration=1",
                "-c:v", "libx264",
                "-c:a", "aac",
                sampleMp4.toAbsolutePath().toString()
        ), 30);

        assertThat(sampleMp4).exists();
        assertThat(Files.size(sampleMp4)).isGreaterThan(0);

        Path outDir = tempDir.resolve("out_video");
        Files.createDirectories(outDir);

        // Convert MP4 -> WebM
        ConversionResult webmResult = videoConverter.convert(sampleMp4, "webm", outDir, new ConversionOptions());
        assertThat(webmResult.getOutputPath()).exists();
        assertThat(webmResult.getContentType()).isEqualTo("video/webm");
        assertThat(webmResult.getFileSize()).isGreaterThan(0);

        // Convert WebM -> MOV
        ConversionResult movResult = videoConverter.convert(webmResult.getOutputPath(), "mov", outDir, new ConversionOptions());
        assertThat(movResult.getOutputPath()).exists();
        assertThat(movResult.getContentType()).isEqualTo("video/quicktime");
        assertThat(movResult.getFileSize()).isGreaterThan(0);
    }
}
