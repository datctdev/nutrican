package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.diet.dto.response.DayPlanResponse;
import com.sba.nutricanbe.diet.entity.MealPlan;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface DayPlanService {
    DayPlanResponse getDayPlan(UUID customerId, LocalDate date);

    /** Published PT meal plan (if any) that covers the given date for this customer. */
    Optional<MealPlan> getPublishedPlanForDate(UUID customerId, LocalDate date);
}
