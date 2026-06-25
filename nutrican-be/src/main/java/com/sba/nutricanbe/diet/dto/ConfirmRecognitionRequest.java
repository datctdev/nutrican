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
public class ConfirmRecognitionRequest {
    private String foodCode;
    /** User-adjusted portion weight (grams) from confirmation modal slider */
    private BigDecimal portionGrams;
}
