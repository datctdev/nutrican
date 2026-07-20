package com.sba.nutricanbe.workspace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealPlanLateTickItemDto {
    private UUID itemId;
    private LocalDate planDate;
    private String mealType;
    private String mealPeriod;
    private String foodLabel;
    private String lateTickReason;
    /** PT_ORIGINAL | SELF_OVERRIDE | DIET_LOG */
    private String source;
}
