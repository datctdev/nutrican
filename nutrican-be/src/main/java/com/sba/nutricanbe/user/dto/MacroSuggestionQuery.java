package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.ActivityLevel;
import com.sba.nutricanbe.user.enums.NutritionGoal;

import java.math.BigDecimal;

public record MacroSuggestionQuery(
        BigDecimal weightKg,
        BigDecimal heightCm,
        Integer age,
        String gender,
        BigDecimal activityFactor,
        ActivityLevel activityLevel,
        Integer sessionsPerWeek,
        Integer minutesPerSession,
        NutritionGoal nutritionGoal,
        Integer pregnancyTrimester) {
}
