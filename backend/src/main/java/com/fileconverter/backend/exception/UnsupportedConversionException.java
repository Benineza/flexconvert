package com.fileconverter.backend.exception;

public class UnsupportedConversionException extends ConversionException {
    public UnsupportedConversionException(String sourceFormat, String targetFormat) {
        super(String.format("Conversion from '%s' to '%s' is not supported.", sourceFormat, targetFormat));
    }

    public UnsupportedConversionException(String message) {
        super(message);
    }
}
