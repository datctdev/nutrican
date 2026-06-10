package com.sba.nutrican_be.diet.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class DietLogItemRequest {
    private UUID foodItemId;
    private String itemName;
    private BigDecimal quantityG;
    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;
}
