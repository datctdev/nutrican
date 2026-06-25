package com.sba.nutricanbe.workspace.dto;

import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.ExperimentCohort;
import com.sba.nutricanbe.diet.enums.MealComplexity;
import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.enums.PtCorrectionReason;
import com.sba.nutricanbe.diet.enums.PtReviewAction;
import com.sba.nutricanbe.diet.enums.RecognitionSource;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import com.sba.nutricanbe.common.dto.MacroNutrients;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DietLogReviewResponse {
    private UUID id;
    private UUID customerId;
    private String customerName;
    private String customerAvatar;
    private String imageUrl;
    private MealType mealType;
    private String foodDescription;
    private BigDecimal aiConfidenceScore;
    private MacroNutrients macrosJson;
    private DietLogStatus status;
    private Boolean sosTicketFlag;
    private LocalDate logDate;
    private LocalDateTime createdAt;

    private List<AdditionalImageInfo> additionalImages;
    private MealSource mealSource;
    private MealComplexity mealComplexity;
    private String restaurantName;
    private RecognitionSource recognitionSource;
    private Map<String, Object> aiRawJson;
    private MacroNutrients aiPredictedMacros;
    private MacroNutrients dbMatchedMacros;
    private MacroNutrients macrosAtReview;
    private MacroNutrients ptAdjustedMacros;
    private MacroNutrients ptBlindMacros;
    private Integer dbMatchScore;
    private String modelVersion;
    private String matchedFoodName;
    private ExperimentCohort experimentCohort;
    private PtReviewAction ptAction;
    private PtCorrectionReason ptCorrectionReason;
    private Boolean blindSubmitted;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdditionalImageInfo {
        private UUID id;
        private String imageUrl;
        private Boolean isPrimary;
        private Integer sortOrder;
    }
}
