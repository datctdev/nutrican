package com.sba.nutricanbe.diet.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class RecipeRequest {
    private String name;
    private List<RecipeIngredientRequest> ingredients;

    @Data
    public static class RecipeIngredientRequest {
        private java.util.UUID foodItemId;
        private java.math.BigDecimal gram;
    }
}
