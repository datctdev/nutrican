package com.sba.nutrican_be.userprofile.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MacroTargetResponse {
    private Long id;
    private BigDecimal dailyCalories;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;
}
