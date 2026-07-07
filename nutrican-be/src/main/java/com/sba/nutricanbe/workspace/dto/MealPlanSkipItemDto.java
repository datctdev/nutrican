package com.sba.nutricanbe.workspace.dto;

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
public class MealPlanSkipItemDto {
    private UUID itemId;
    private LocalDate planDate;
    private String mealType;
    private String foodLabel;
    private String skipReason;
    private String skipNote;
}
