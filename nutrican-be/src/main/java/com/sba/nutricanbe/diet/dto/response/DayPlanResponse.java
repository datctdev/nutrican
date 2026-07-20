package com.sba.nutricanbe.diet.dto.response;

import com.sba.nutricanbe.diet.enums.MealType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DayPlanResponse {
    private LocalDate date;
    @Builder.Default
    private List<DayPlanItemResponse> items = new ArrayList<>();
    private BigDecimal totalCalories;
    private BigDecimal totalProtein;
    private BigDecimal totalCarb;
    private BigDecimal totalFat;
    private boolean hasPtPlan;
}
