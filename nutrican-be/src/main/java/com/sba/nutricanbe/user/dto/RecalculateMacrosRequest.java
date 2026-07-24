package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.ActivityLevel;
import com.sba.nutricanbe.user.enums.NutritionGoal;
import lombok.Data;

@Data
public class RecalculateMacrosRequest {
    /** Compat: required unless sessionsPerWeek + minutesPerSession are both provided. */
    private ActivityLevel activityLevel;
    private Integer sessionsPerWeek;
    private Integer minutesPerSession;
    private NutritionGoal nutritionGoal;
    private Integer pregnancyTrimester;
}
