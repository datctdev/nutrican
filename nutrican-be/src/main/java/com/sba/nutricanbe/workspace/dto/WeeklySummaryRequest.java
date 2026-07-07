package com.sba.nutricanbe.workspace.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class WeeklySummaryRequest {
    private UUID clientId;
    private LocalDate weekStartDate;
    private String summaryText;
    private BigDecimal adherenceRate;
    private String nextPlanNote;
}
