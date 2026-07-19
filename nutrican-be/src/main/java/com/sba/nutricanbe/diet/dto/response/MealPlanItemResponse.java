package com.sba.nutricanbe.diet.dto.response;

import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.enums.MealPlanSkipReason;
import com.sba.nutricanbe.diet.enums.MealType;
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
public class MealPlanItemResponse {
    private UUID id;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID mealPlanId;
    private LocalDate planDate;
    private MealType mealType;
    private String foodCode;
    private String freeText;
    private BigDecimal portionGrams;
    private String note;
    private Boolean eaten;
    private MealPlanSkipReason skipReason;
    private String skipNote;

    public static MealPlanItemResponse from(MealPlanItem item) {
        return MealPlanItemResponse.builder()
                .id(item.getId())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .mealPlanId(item.getMealPlanId())
                .planDate(item.getPlanDate())
                .mealType(item.getMealType())
                .foodCode(item.getFoodCode())
                .freeText(item.getFreeText())
                .portionGrams(item.getPortionGrams())
                .note(item.getNote())
                .eaten(item.getEaten())
                .skipReason(item.getSkipReason())
                .skipNote(item.getSkipNote())
                .build();
    }
}
