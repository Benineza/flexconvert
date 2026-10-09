package com.fileconverter.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversionOptions {
    @Builder.Default
    private String pageSelection = "all";
    @Builder.Default
    private int pageStart = 1;
    @Builder.Default
    private int pageEnd = 1;
    @Builder.Default
    private int quality = 90;
    @Builder.Default
    private int dpi = 150;
    @Builder.Default
    private String pageSize = "a4";
    @Builder.Default
    private String orientation = "portrait";
    @Builder.Default
    private String imageFit = "fit";
}
