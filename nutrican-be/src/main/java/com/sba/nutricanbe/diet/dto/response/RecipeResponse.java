package com.sba.nutricanbe.diet.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class RecipeResponse {
    private UUID id;
    private String name;
    private BigDecimal totalCalories;
    private BigDecimal totalProtein;
    private BigDecimal totalCarb;
    private BigDecimal totalFat;
    private List<RecipeIngredientResponse> ingredients;
    private List<PlanDietPrefWarning> dietPrefWarnings;

    @Data
    @Builder
    public static class RecipeIngredientResponse {
        private UUID foodItemId;
        private String itemName;
        private BigDecimal gram;
        private BigDecimal calories;
        private BigDecimal protein;
        private BigDecimal carb;
        private BigDecimal fat;
    }
}
