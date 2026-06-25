package com.sba.nutricanbe.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LlavaMealAnalysisResult {
    private boolean success;
    private String foodNameVi;
    private String portionDescription;
    private BigDecimal estimatedTotalGrams;
    private BigDecimal confidence;
    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carbs;
    private BigDecimal fat;
    private List<LlavaFoodItem> items;
    private String rawJson;
    private String message;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LlavaFoodItem {
        private String name;
        private BigDecimal estimatedGrams;
        private String role;
    }
}
