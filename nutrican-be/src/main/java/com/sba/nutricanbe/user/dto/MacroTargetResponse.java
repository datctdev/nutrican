package com.sba.nutricanbe.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MacroTargetResponse {
    private UUID id;
    private BigDecimal dailyCalories;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;
}
