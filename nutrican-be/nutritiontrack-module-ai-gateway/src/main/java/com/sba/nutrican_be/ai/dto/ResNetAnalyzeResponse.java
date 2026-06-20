package com.sba.nutrican_be.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ResNetAnalyzeResponse {

    private boolean success;
    private String message;
    private DataPayload data;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DataPayload {
        private String foodName;
        private String foodCode;
        private double confidence;
        private Map<String, Number> macros;
    }
}
