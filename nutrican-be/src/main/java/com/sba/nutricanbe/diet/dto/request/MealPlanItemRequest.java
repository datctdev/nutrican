package com.sba.nutricanbe.diet.dto.request;

import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealType;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class MealPlanItemRequest {
    private UUID id;
    private LocalDate planDate;
    private MealType mealType;
    private MealPeriod mealPeriod;
    private String foodCode;
    private String freeText;
    private BigDecimal portionGrams;
    private String note;
}
