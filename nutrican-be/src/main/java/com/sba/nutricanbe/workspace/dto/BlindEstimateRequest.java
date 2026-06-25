package com.sba.nutricanbe.workspace.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class BlindEstimateRequest {
    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;
}
