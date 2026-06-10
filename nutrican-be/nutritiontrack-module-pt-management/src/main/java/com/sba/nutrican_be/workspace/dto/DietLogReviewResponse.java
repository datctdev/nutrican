package com.sba.nutrican_be.workspace.dto;

import com.sba.nutrican_be.core.enums.DietLogStatus;
import com.sba.nutrican_be.core.enums.ExperimentCohort;
import com.sba.nutrican_be.core.enums.MealComplexity;
import com.sba.nutrican_be.core.enums.MealSource;
import com.sba.nutrican_be.core.enums.MealType;
import com.sba.nutrican_be.core.enums.PtCorrectionReason;
import com.sba.nutrican_be.core.enums.PtReviewAction;
import com.sba.nutrican_be.core.enums.RecognitionSource;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
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
    private Map<String, Object> macrosJson;
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
    private Map<String, Object> aiPredictedMacros;
    private Map<String, Object> dbMatchedMacros;
    private Map<String, Object> macrosAtReview;
    private Map<String, Object> ptAdjustedMacros;
    private Map<String, Object> ptBlindMacros;
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
