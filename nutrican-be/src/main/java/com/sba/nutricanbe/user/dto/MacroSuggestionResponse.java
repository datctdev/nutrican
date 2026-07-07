package com.sba.nutricanbe.user.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class MacroSuggestionResponse {
    private BigDecimal dailyCalories;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;
    private String note;
}
