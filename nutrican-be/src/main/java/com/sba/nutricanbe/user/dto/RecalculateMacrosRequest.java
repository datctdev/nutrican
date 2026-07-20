package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.ActivityLevel;
import com.sba.nutricanbe.user.enums.NutritionGoal;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RecalculateMacrosRequest {
    @NotNull
    private ActivityLevel activityLevel;
    private NutritionGoal nutritionGoal;
    private Integer pregnancyTrimester;
}
