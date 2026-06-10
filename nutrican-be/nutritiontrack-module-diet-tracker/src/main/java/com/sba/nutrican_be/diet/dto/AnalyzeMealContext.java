package com.sba.nutrican_be.diet.dto;

import com.sba.nutrican_be.core.enums.MealComplexity;
import com.sba.nutrican_be.core.enums.MealSource;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class AnalyzeMealContext {
    private String mealType;
    private MealSource mealSource;
    private MealComplexity mealComplexity;
    private String restaurantName;
    private UUID hotpotBrothId;
    private List<UUID> hotpotItemIds;
    private List<BigDecimal> hotpotPortions;
    private List<UUID> compositeItemIds;
    private List<BigDecimal> compositePortions;
}
