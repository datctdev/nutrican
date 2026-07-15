package com.sba.nutricanbe.diet.dto;

import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.IntakeStatus;
import com.sba.nutricanbe.diet.enums.MealComplexity;
import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.enums.PtCorrectionReason;
import com.sba.nutricanbe.diet.enums.RecognitionSource;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.sba.nutricanbe.common.dto.MacroNutrients;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DietLogResponse {
    private UUID id;
    private UUID customerId;
    private String customerName;
    private String imageUrl;
    private BigDecimal aiConfidenceScore;
    private MacroNutrients macrosJson;
    private MealType mealType;
    private DietLogStatus status;
    private DietLogReviewStatus reviewStatus;
    private String foodDescription;
    private String matchedFoodName;
    private String aiFoodCode;
    private Boolean sosTicketFlag;
    private UUID ptReviewerId;
    private String ptNote;
    private PtCorrectionReason ptCorrectionReason;
    private LocalDate logDate;
    private LocalDateTime createdAt;
    private java.util.List<DietLogImageDto> additionalImages;
    private MealSource mealSource;
    private MealComplexity mealComplexity;
    private String restaurantName;
    private RecognitionSource recognitionSource;
    private UUID foodItemId;
    private Boolean suggestSos;
    private java.util.List<FoodItemResponse> suggestedFoodMatches;
    private java.util.List<DietLogItemResponse> items;
    private java.util.List<String> allergyWarnings;
    private String dietPrefWarning;
    private IntakeStatus intakeStatus;
    private String controlLoopMessage;
    private Boolean suggestSubmitToPt;
}