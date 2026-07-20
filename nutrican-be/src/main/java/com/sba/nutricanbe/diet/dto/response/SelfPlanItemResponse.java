package com.sba.nutricanbe.diet.dto.response;

import com.sba.nutricanbe.diet.entity.SelfPlanItem;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SelfPlanItemResponse {
    private UUID id;
    private LocalDate planDate;
    private MealType mealType;
    private MealPeriod mealPeriod;
    private UUID foodItemId;
    private String itemName;
    private BigDecimal quantityG;
    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;
    private Boolean eaten;
    private UUID dietLogId;
    private UUID submissionId;
    private Boolean lockedByReview;
    private Boolean applied;

    public static SelfPlanItemResponse from(SelfPlanItem item) {
        return SelfPlanItemResponse.builder()
                .id(item.getId())
                .planDate(item.getPlanDate())
                .mealType(item.getMealType())
                .mealPeriod(item.getMealPeriod())
                .foodItemId(item.getFoodItemId())
                .itemName(item.getItemName())
                .quantityG(item.getQuantityG())
                .calories(item.getCalories())
                .protein(item.getProtein())
                .carb(item.getCarb())
                .fat(item.getFat())
                .eaten(Boolean.TRUE.equals(item.getEaten()))
                .dietLogId(item.getDietLogId())
                .submissionId(item.getSubmissionId())
                .lockedByReview(Boolean.TRUE.equals(item.getLockedByReview()))
                .applied(Boolean.TRUE.equals(item.getApplied()))
                .build();
    }
}
