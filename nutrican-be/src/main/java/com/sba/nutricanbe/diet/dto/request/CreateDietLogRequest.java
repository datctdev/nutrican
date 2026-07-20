package com.sba.nutricanbe.diet.dto.request;

import com.sba.nutricanbe.diet.enums.MealComplexity;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.MealType;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class CreateDietLogRequest {
    private MealType mealType;
    private MealPeriod mealPeriod;
    private MealPeriod makeupForPeriod;
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
    private Boolean sendToPt;
    private String lateTickReason;
    private UUID recipeId;
    private String foodCode;
    private BigDecimal portionGrams;
}
