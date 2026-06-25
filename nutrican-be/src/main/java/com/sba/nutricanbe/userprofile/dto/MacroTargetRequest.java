package com.sba.nutricanbe.userprofile.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class MacroTargetRequest {
    private BigDecimal dailyCalories;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;
}
