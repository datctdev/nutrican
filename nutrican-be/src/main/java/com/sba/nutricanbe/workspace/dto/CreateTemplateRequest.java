package com.sba.nutricanbe.workspace.dto;

import com.sba.nutricanbe.diet.enums.MealType;
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
public class CreateTemplateRequest {
    private String name;
    private String description;
    private List<TemplateItemDto> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TemplateItemDto {
        private Integer dayOffset; // 0 to 6
        private String mealType;
        private String foodCode;
        private String freeText;
        private BigDecimal portionGrams;
    }
}
