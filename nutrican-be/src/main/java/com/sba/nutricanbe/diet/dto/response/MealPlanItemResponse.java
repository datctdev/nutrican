package com.sba.nutricanbe.diet.dto.response;

import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealPlanItemSourceType;
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
    private MealPeriod mealPeriod;
    private String foodCode;
    private String freeText;
    private BigDecimal portionGrams;
    private String note;
    private Boolean eaten;
    private MealPlanSkipReason skipReason;
    private String skipNote;
    private MealPlanItemSourceType sourceType;
    private UUID foodItemId;
    private String lateTickReason;
    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;

    public static MealPlanItemResponse from(MealPlanItem item) {
        return from(item, null);
    }

    public static MealPlanItemResponse from(MealPlanItem item, MacroNutrients macros) {
        return MealPlanItemResponse.builder()
                .id(item.getId())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .mealPlanId(item.getMealPlanId())
                .planDate(item.getPlanDate())
                .mealType(item.getMealType())
                .mealPeriod(item.getMealPeriod())
                .foodCode(item.getFoodCode())
                .freeText(item.getFreeText())
                .portionGrams(item.getPortionGrams())
                .note(item.getNote())
                .eaten(item.getEaten())
                .skipReason(item.getSkipReason())
                .skipNote(item.getSkipNote())
                .sourceType(item.getSourceType() != null ? item.getSourceType() : MealPlanItemSourceType.PT_ORIGINAL)
                .foodItemId(item.getFoodItemId())
                .lateTickReason(item.getLateTickReason())
                .calories(macros != null ? macros.calories() : null)
                .protein(macros != null ? macros.protein() : null)
                .carb(macros != null ? macros.carbs() : null)
                .fat(macros != null ? macros.fat() : null)
                .build();
    }
}
