package com.sba.nutricanbe.diet.dto;

import com.sba.nutricanbe.diet.enums.MealType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyzeMealResponse {
    private UUID logId;
    private String foodName;
    private String foodCode;
    private BigDecimal portionSize;
    private BigDecimal portionRatio;
    private String portionUnit;
    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;
    private BigDecimal confidenceScore;
    private boolean fallback;
    private Boolean needsConfirmation;
    private String message;
    private MealType mealType;
    private Boolean suggestSos;
    private List<FoodItemResponse> suggestedFoodMatches;
    private List<FoodPredictionResponse> topPredictions;
    private Boolean llavaUsed;
    private String macroSource;
    private String llavaFoodName;
    private BigDecimal estimatedTotalGrams;
}
