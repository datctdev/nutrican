package com.sba.nutricanbe.diet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealPlanSaveResult {
    private MealPlanResponse plan;
    private List<MealPlanItemResponse> items;
    private List<PlanDietPrefWarning> dietPrefWarnings;
    private String macroWarning;
}
