package com.sba.nutricanbe.chat.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class ChatContextSummaryDto {
    private LocalDate date;
    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carbs;
    private BigDecimal fat;
    private BigDecimal calorieTarget;
    private String intakeStatus;
}
