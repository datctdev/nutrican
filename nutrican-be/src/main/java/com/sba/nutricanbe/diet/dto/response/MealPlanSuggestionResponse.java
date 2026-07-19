package com.sba.nutricanbe.diet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealPlanSuggestionResponse {
    private UUID id;
    private UUID mealPlanItemId;
    private UUID customerId;
    private String originalFoodCode;
    private String originalFoodName;
    private BigDecimal originalGram;
    private String suggestedFoodCode;
    private String suggestedFoodName;
    private BigDecimal suggestedGram;
    private String requestReason;
    private String customerNote;
    private String ptNote;
    private LocalDate planDate;
    private String mealType;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime decidedAt;
}
