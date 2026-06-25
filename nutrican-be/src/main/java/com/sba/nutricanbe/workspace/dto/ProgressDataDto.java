package com.sba.nutricanbe.workspace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
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
    }
}
