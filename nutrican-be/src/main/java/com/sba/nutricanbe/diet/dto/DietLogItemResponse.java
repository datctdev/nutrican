package com.sba.nutricanbe.diet.dto;

import com.sba.nutricanbe.diet.enums.DietLogItemSource;
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
public class DietLogItemResponse {
    private UUID id;
    private UUID foodItemId;
    private String itemName;
    private BigDecimal quantityG;
    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;
    private DietLogItemSource source;
}
