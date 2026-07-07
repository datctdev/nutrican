package com.sba.nutricanbe.workspace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostMealWeekAggregateDto {
    private LocalDate weekStart;
    private BigDecimal avgEnergy;
    private BigDecimal avgHunger;
    private int sampleCount;
}
