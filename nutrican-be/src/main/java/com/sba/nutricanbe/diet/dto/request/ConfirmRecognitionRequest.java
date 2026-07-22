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

    private String foodCode;

    private UUID foodItemId;

    private BigDecimal portionGrams;

    private Boolean sendToPt;
}
