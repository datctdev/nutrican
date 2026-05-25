package com.sba.nutrican_be.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealRecognitionResult {
    private String foodName;
    private BigDecimal portionSize;
    private String portionUnit;
    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;
    private BigDecimal confidenceScore;
    private boolean fallback;
    private String message;
}
