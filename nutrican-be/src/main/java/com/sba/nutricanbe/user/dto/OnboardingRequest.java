package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.ActivityLevel;
import com.sba.nutricanbe.user.enums.DietPreference;
import com.sba.nutricanbe.user.enums.NutritionGoal;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class OnboardingRequest {
    private int step;
    private Integer heightCm;
    private BigDecimal weightKg;
    private LocalDate dateOfBirth;
    private String gender;
    private NutritionGoal nutritionGoal;
    private DietPreference dietPreference;
    private Boolean wantsPt;
    /** Preferred: enum. Legacy BigDecimal factor still accepted via activityFactor. */
    private ActivityLevel activityLevel;
    private BigDecimal activityFactor;
    private Integer pregnancyTrimester;
}
