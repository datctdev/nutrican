package com.sba.nutricanbe.workspace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.sba.nutricanbe.user.dto.ClientGoalDto;
import com.sba.nutricanbe.workspace.dto.MilestoneDto;
import com.sba.nutricanbe.workspace.dto.RegressionAlertDto;
import com.sba.nutricanbe.workspace.dto.WeeklyAdherenceDto;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProgressDataDto {
    private UUID clientId;
    private String clientName;
    private List<DailyCalorieData> calorieHistory;
    private List<BodyMetricData> bodyMetrics;
    private MacroSummary macroSummary;
    private ClientGoalDto goals;
    private LocalDate projectedCompletion;
    private List<MilestoneDto> milestones;
    private RegressionAlertDto regressionAlert;
    private List<WeeklyAdherenceDto> weeklyAdherence;
    private List<MealPlanSkipItemDto> skipReasons;
    private List<MealPlanSuggestionDto> pendingSuggestions;
    private List<PostMealWeekAggregateDto> postMealAggregate;
    private List<WeeklySummaryDto> weeklySummaries;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyCalorieData {
        private LocalDate date;
        private BigDecimal calories;
        private BigDecimal target;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BodyMetricData {
        private LocalDate date;
        private BigDecimal weight;
        private BigDecimal bodyFatPercent;
        private BigDecimal lbm;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MacroSummary {
        private BigDecimal avgCalories;
        private BigDecimal avgProtein;
        private BigDecimal avgCarb;
        private BigDecimal avgFat;
        private BigDecimal adherenceRate;
        private BigDecimal mealPlanAdherenceRate;
    }
}
