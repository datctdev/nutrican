package com.sba.nutricanbe.diet.dto.request;

import com.sba.nutricanbe.diet.enums.MealComplexity;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.MealType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
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

    @Size(max = 255)
    private String foodDescription;

    @DecimalMin(value = "0", inclusive = true)
    private BigDecimal calories;

    @DecimalMin(value = "0", inclusive = true)
    private BigDecimal protein;

    @DecimalMin(value = "0", inclusive = true)
    private BigDecimal carb;

    @DecimalMin(value = "0", inclusive = true)
    private BigDecimal fat;

    private LocalDate logDate;
    private MealSource mealSource;
    private MealComplexity mealComplexity;

    @Size(max = 255)
    private String restaurantName;

    private UUID foodItemId;
    private List<DietLogItemRequest> items;
    private Boolean sendToPt;

    /** Max only — min length for late-tick is enforced in service when late-tick applies. */
    @Size(max = 500)
    private String lateTickReason;

    private UUID recipeId;

    @Size(max = 64)
    private String foodCode;

    @DecimalMin(value = "0", inclusive = true)
    private BigDecimal portionGrams;
}
