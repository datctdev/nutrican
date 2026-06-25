package com.sba.nutricanbe.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import com.sba.nutricanbe.common.dto.MacroNutrients;
import java.util.UUID;

@Data
@Builder
public class RblExportRowDto {
    private UUID logId;
    private LocalDate logDate;
    private String mealSource;
    private String mealComplexity;
    private String recognitionSource;
    private String experimentCohort;
    private BigDecimal aiConfidence;
    private Integer dbMatchScore;
    private String modelVersion;
    private String promptVersion;
    private String aiFoodName;
    private String dbFoodName;
    private MacroNutrients aiPredictedMacros;
    private MacroNutrients dbMatchedMacros;
    private MacroNutrients macrosAtReview;
    private MacroNutrients ptAdjustedMacros;
    private MacroNutrients ptBlindMacros;
    private BigDecimal deltaAiCalories;
    private BigDecimal deltaDbCalories;
    private String ptAction;
    private String ptCorrectionReason;
    private LocalDateTime ptReviewedAt;
    private Boolean sosTicketFlag;
    private String sosReasonCode;
    private String fieldsChanged;
    private String customerIdHash;
    private String imageObjectName;
    private Object dietLogItemsJson;
    private BigDecimal aiPortionG;
    private Boolean dbApplied;
}
