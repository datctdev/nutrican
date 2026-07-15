package com.sba.nutricanbe.user.dto;

import lombok.Data;
import java.math.BigDecimal;

import com.sba.nutricanbe.user.enums.NutritionGoal;

@Data
public class MacroTargetRequest {
    private BigDecimal dailyCalories;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;
    private NutritionGoal nutritionGoal;
}
