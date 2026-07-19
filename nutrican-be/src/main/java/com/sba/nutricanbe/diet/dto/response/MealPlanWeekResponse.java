package com.sba.nutricanbe.diet.dto.response;

import com.sba.nutricanbe.diet.entity.MealPlan;

import java.time.LocalDate;
import java.util.UUID;

public record MealPlanWeekResponse(UUID planId, LocalDate weekStart, LocalDate weekEnd) {

    public static MealPlanWeekResponse from(MealPlan plan) {
        return new MealPlanWeekResponse(
                plan.getId(), plan.getWeekStart(), plan.getWeekStart().plusDays(6));
    }
}
