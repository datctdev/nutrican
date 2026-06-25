package com.sba.nutricanbe.diet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodPredictionResponse {
    private String foodCode;
    private String foodName;
    private BigDecimal confidence;
    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;
}
