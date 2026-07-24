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
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProgressDataDto {
    private UUID clientId;
    private String clientName;
    /** When set, meal-plan weeks use coaching boundaries (start + 7*i). */
    private LocalDateTime coachingStartedAt;
    private List<DailyCalorieData> calorieHistory;
    private List<BodyMetricData> bodyMetrics;
    private MacroSummary macroSummary;
    private ClientGoalDto goals;
    private LocalDate projectedCompletion;
    private List<MilestoneDto> milestones;
    private RegressionAlertDto regressionAlert;
    private List<WeeklyAdherenceDto> weeklyAdherence;
    private List<MealPlanSkipItemDto> skipReasons;
    private List<MealPlanLateTickItemDto> lateTickReasons;
    private List<MealPlanSuggestionDto> pendingSuggestions;
    private List<PostMealWeekAggregateDto> postMealAggregate;
    private List<WeeklySummaryDto> weeklySummaries;
    private List<MealPlanWeekOption> mealPlanWeeks;
    private MealPlanAdherenceSummary mealPlanAdherence;

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
        /** Preferred for BodyCompositionChart (same as BodyMetricDto.recordDate). */
        private LocalDate recordDate;
        /** Legacy alias — keep equal to recordDate for older clients. */
        private LocalDate date;
        private BigDecimal weight;
        private BigDecimal bodyFatPercent;
        private BigDecimal muscleMass;
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

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MealPlanWeekOption {
        private UUID planId;
        private LocalDate weekStart;
        private LocalDate weekEnd;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MealPlanAdherenceSummary {
        private LocalDate weekStart;
        private LocalDate weekEnd;
        private Integer totalItems;
        private Integer dueItems;
        private Integer eatenItems;
        private Integer skippedItems;
        private Integer pendingItems;
        private Integer expectedMealSlots;
        private Integer loggedMealSlots;
        private BigDecimal adherenceRate;
        private BigDecimal logCoverageRate;
        private List<DailyMealPlanAdherence> daily;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyMealPlanAdherence {
        private LocalDate date;
        private Integer totalItems;
        private Integer dueItems;
        private Integer eatenItems;
        private Integer skippedItems;
        private Integer pendingItems;
        private BigDecimal adherenceRate;
        private Boolean future;
    }
}
