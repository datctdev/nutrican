package com.sba.nutricanbe.workspace.dto;

import com.sba.nutricanbe.user.enums.ActivityLevel;
import com.sba.nutricanbe.user.enums.DietPreference;
import com.sba.nutricanbe.user.enums.NutritionGoal;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PtClientProfileDto {
    private UUID clientId;
    private String fullName;
    private String email;
    private String phoneNumber;
    private Integer heightCm;
    private String gender;
    private LocalDate dateOfBirth;
    private BigDecimal weight;
    private BigDecimal bodyFatPercent;
    /** Read-only on GET: mirrors MacroTarget.dailyCalories. PUT ignores this field (use macro-target). */
    private BigDecimal tdee;
    private String allergyNotes;
    /** Food catalog codes (additive; keeps allergyNotes free-text). */
    private List<String> allergicFoodCodes;
    private DietPreference dietPreference;
    private String specialNotes;
    private ActivityLevel activityLevel;
    private Integer exerciseSessionsPerWeek;
    private Integer exerciseMinutesPerSession;

    private NutritionGoal nutritionGoal;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;
}
