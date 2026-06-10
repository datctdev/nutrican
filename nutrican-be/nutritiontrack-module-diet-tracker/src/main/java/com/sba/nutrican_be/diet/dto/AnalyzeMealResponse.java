package com.sba.nutrican_be.diet.dto;

import com.sba.nutrican_be.core.enums.MealType;
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
    private BigDecimal portionSize;
    private String portionUnit;
    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;
    private BigDecimal confidenceScore;
    private boolean fallback;
    private String message;
    private MealType mealType;
    private Boolean suggestSos;
    private List<FoodItemResponse> suggestedFoodMatches;
}
