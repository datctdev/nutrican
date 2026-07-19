package com.sba.nutricanbe.diet.dto.response;

import com.sba.nutricanbe.diet.entity.MealPlan;
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
                .notes(plan.getNotes())
                .isPublished(plan.getIsPublished())
                .build();
    }
}
