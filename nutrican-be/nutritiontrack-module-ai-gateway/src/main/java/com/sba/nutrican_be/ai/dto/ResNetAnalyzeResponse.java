package com.sba.nutrican_be.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ResNetAnalyzeResponse {

    private boolean success;
    private String message;
    private DataPayload data;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DataPayload {
        @JsonProperty("food_name")
        private String foodName;
        @JsonProperty("food_code")
        private String foodCode;
        private double confidence;
        @JsonProperty("confidence_margin")
        private Double confidenceMargin;
        @JsonProperty("top_predictions")
        private List<FoodPredictionDto> topPredictions;
        @JsonProperty("needs_confirmation")
        private Boolean needsConfirmation;
        @JsonProperty("portion_ratio")
        private Double portionRatio;
        @JsonProperty("food_area_ratio")
        private Double foodAreaRatio;
        @JsonProperty("model_version")
        private String modelVersion;
    }
}
