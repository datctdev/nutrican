package com.sba.nutricanbe.diet.dto.request;

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
    /** When true, queue log for PT review after confirmation */
    private Boolean sendToPt;
}
