package com.sba.nutricanbe.diet.dto.response;

import com.sba.nutricanbe.diet.entity.WeeklySummary;
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
public class MealPlanWeeklySummaryResponse {
    private UUID id;
    private LocalDate weekStartDate;
    private String summaryText;
    private BigDecimal adherenceRate;
    private String nextPlanNote;

    public static MealPlanWeeklySummaryResponse from(WeeklySummary summary) {
        return MealPlanWeeklySummaryResponse.builder()
                .id(summary.getId())
                .weekStartDate(summary.getWeekStartDate())
                .summaryText(summary.getSummaryText())
                .adherenceRate(summary.getAdherenceRate())
                .nextPlanNote(summary.getNextPlanNote())
                .build();
    }
}
