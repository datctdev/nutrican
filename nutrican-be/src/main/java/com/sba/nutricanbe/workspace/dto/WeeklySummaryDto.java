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
public class WeeklySummaryDto {
    private UUID id;
    private LocalDate weekStartDate;
    private String summaryText;
    private BigDecimal adherenceRate;
    private String nextPlanNote;
}
