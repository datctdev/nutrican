package com.sba.nutrican_be.diet.dto;

import com.sba.nutrican_be.core.enums.MealComplexity;
import com.sba.nutrican_be.core.enums.MealSource;
import com.sba.nutrican_be.core.enums.MealType;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class CreateDietLogRequest {
    private MealType mealType;
    private String foodDescription;
    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;
    private LocalDate logDate;
    private MealSource mealSource;
    private MealComplexity mealComplexity;
    private String restaurantName;
    private UUID foodItemId;
    private List<DietLogItemRequest> items;
}
