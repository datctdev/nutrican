package com.sba.nutricanbe.diet.dto.response;

import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealPlanItemSourceType;
import com.sba.nutricanbe.diet.enums.MealType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DayPlanItemResponse {
    private UUID id;
    /** SELF | PT */
    private String source;
    private boolean locked;
    private MealType mealType;
    private MealPeriod mealPeriod;
    private String name;
    private BigDecimal quantityG;
    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;
    private boolean eaten;
    private UUID foodItemId;
    private String skipReason;
    private MealPlanItemSourceType sourceType;
    private Boolean lockedByReview;
    private Boolean applied;
    private UUID submissionId;
    private String reconcileStatus;
    private String lateTickReason;
    /** Self đề xuất bị PT từ chối — hiển thị gạch ngang, giữ lịch sử. */
    private Boolean choiceRejected;
}
