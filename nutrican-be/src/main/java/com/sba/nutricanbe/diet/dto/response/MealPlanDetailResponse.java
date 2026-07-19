package com.sba.nutricanbe.diet.dto.response;

import java.util.List;

public record MealPlanDetailResponse(
        MealPlanResponse plan,
        List<MealPlanItemResponse> items,
        List<PlanDietPrefWarning> dietPrefWarnings) {
}
