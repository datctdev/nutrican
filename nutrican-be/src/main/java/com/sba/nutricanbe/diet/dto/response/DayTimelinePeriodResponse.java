package com.sba.nutricanbe.diet.dto.response;

import com.sba.nutricanbe.diet.enums.MealPeriod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DayTimelinePeriodResponse {
    private MealPeriod mealPeriod;
    private String labelVi;

    private String windowStatus;
    private boolean settled;

    private String settledReason;
    @Builder.Default
    private List<DayPlanItemResponse> plannedItems = new ArrayList<>();
    @Builder.Default
    private List<DietLogResponse> actualLogs = new ArrayList<>();
    private DayTimelineMacroBreakdown actualTotals;
    private DayTimelineMacroBreakdown plannedTotals;
    private DayTimelineReconciliation reconciliation;
}
