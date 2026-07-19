package com.sba.nutricanbe.diet.dto.response;

import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.entity.MealPlanSuggestion;
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

    public static MealPlanSuggestionResponse from(
            MealPlanSuggestion suggestion, MealPlanItem item) {
        return MealPlanSuggestionResponse.builder()
                .id(suggestion.getId())
                .mealPlanItemId(suggestion.getMealPlanItemId())
                .customerId(suggestion.getCustomerId())
                .originalFoodCode(suggestion.getOriginalFoodCode())
                .originalFoodName(suggestion.getOriginalFoodName())
                .originalGram(suggestion.getOriginalGram())
                .suggestedFoodCode(suggestion.getSuggestedFoodCode())
                .suggestedFoodName(suggestion.getSuggestedFoodName())
                .suggestedGram(suggestion.getSuggestedGram())
                .requestReason(suggestion.getRequestReason())
                .customerNote(suggestion.getCustomerNote())
                .ptNote(suggestion.getPtNote())
                .planDate(item != null ? item.getPlanDate() : null)
                .mealType(item != null && item.getMealType() != null ? item.getMealType().name() : null)
                .status(suggestion.getStatus() != null ? suggestion.getStatus().name() : null)
                .createdAt(suggestion.getCreatedAt())
                .updatedAt(suggestion.getUpdatedAt())
                .decidedAt(suggestion.getDecidedAt())
                .build();
    }
}
