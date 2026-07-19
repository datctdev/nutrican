package com.sba.nutricanbe.diet.dto.request;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class MealPlanSuggestionRequest {
    private String suggestedFoodCode;
    private String suggestedFoodName;
    private BigDecimal suggestedGram;
    private String reason;
    private String customerNote;
}
