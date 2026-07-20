package com.sba.nutricanbe.diet.dto.request;

import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealType;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SelfPlanItemUpdateRequest {
    private MealType mealType;
    private MealPeriod mealPeriod;
    private BigDecimal quantityG;
}
