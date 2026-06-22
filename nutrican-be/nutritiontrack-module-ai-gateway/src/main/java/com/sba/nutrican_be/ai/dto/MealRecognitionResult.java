package com.sba.nutrican_be.ai.dto;

import com.sba.nutrican_be.ai.dto.FoodPredictionDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealRecognitionResult {
    private String foodName;
    private String foodCode;
    private BigDecimal portionSize;
    private String portionUnit;
    private BigDecimal portionRatio;
    private BigDecimal foodAreaRatio;
    private BigDecimal estimatedTotalGrams;
    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carbs;
    private BigDecimal fat;
    private BigDecimal confidenceScore;
    private BigDecimal confidenceMargin;
    private Boolean needsConfirmation;
    private List<FoodPredictionDto> topPredictions;
    private Boolean llavaUsed;
    private String macroSource;
    private String fusionNote;
    private String llavaFoodName;
    private boolean fallback;
    private String message;
    private String mealComplexityFromAi;
    private List<Map<String, Object>> detectedItems;
    private List<String> uncertaintyReasons;
}

