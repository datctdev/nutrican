package com.sba.nutricanbe.workspace.dto;

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
    private BigDecimal tdee;
    private String allergyNotes;
    private DietPreference dietPreference;
    private String specialNotes;

    private NutritionGoal nutritionGoal;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;
}
