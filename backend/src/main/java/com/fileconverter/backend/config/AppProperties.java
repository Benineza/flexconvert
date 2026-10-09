package com.fileconverter.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private Cors cors = new Cors();
    private Ffmpeg ffmpeg = new Ffmpeg();
    private Libreoffice libreoffice = new Libreoffice();
    private Conversion conversion = new Conversion();

    @Getter
    @Setter
    public static class Cors {
        private List<String> allowedOrigins = List.of("http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173");
    }

    @Getter
    @Setter
    public static class Ffmpeg {
        private String path = "C:/Program Files/Shotcut/ffmpeg.exe";
    }

    @Getter
    @Setter
    public static class Libreoffice {
        private String path = "";
    }

    @Getter
    @Setter
    public static class Conversion {
        private String tempDir = System.getProperty("java.io.tmpdir") + "/flexconvert";
    }
}
