package com.sba.nutricanbe.workspace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealPlanSuggestionDto {
    private UUID id;
    private UUID mealPlanItemId;
    private String suggestedFoodCode;
    private String suggestedFoodName;
    private BigDecimal suggestedGram;
    private String status;
}
