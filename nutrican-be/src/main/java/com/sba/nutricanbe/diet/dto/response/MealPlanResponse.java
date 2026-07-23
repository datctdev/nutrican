package com.sba.nutricanbe.diet.dto.response;

import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.enums.MealPlanWeekBasis;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealPlanResponse {
    private UUID id;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID clientId;
    private UUID ptId;
    private LocalDate weekStart;
    /** MONDAY | COACHING — additive for dual week model. */
    private String weekBasis;
    private String notes;
    private Boolean isPublished;

    public static MealPlanResponse from(MealPlan plan) {
        return MealPlanResponse.builder()
                .id(plan.getId())
                .createdAt(plan.getCreatedAt())
                .updatedAt(plan.getUpdatedAt())
                .clientId(plan.getClientId())
                .ptId(plan.getPtId())
                .weekStart(plan.getWeekStart())
                .weekBasis(plan.getWeekBasis() != null ? plan.getWeekBasis().name() : MealPlanWeekBasis.MONDAY.name())
                .notes(plan.getNotes())
                .isPublished(plan.getIsPublished())
                .build();
    }
}
