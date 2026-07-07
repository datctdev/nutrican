package com.sba.nutricanbe.workspace.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class WeeklyAdherenceDto {
    private LocalDate weekStart;
    private BigDecimal adherenceRate;
    private int loggedDays;
}
