package com.sba.nutricanbe.diet.dto.request;

import lombok.Data;

import java.time.LocalDate;

@Data
public class MealPlanMealActionRequest {
    private LocalDate planDate;
    private String mealType;
    private String mealPeriod;
    private String skipReason;
    private String skipNote;
}
