package com.sba.nutricanbe.diet.dto.request;

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
public class ConfirmRecognitionRequest {
    /** ResNet food code (from Top-3). Optional if foodItemId is set. */
    private String foodCode;
    /** Catalog food id (from search). Preferred when set. */
    private UUID foodItemId;
    /** User-adjusted portion weight (grams) from confirmation modal slider */
    private BigDecimal portionGrams;
    /** When true, queue log for PT review after confirmation (BE resolves if PT exists). */
    private Boolean sendToPt;
}
