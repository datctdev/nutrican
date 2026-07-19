package com.sba.nutricanbe.diet.dto.response;

import java.time.LocalDate;
import java.util.UUID;

public record MealPlanWeekResponse(UUID planId, LocalDate weekStart, LocalDate weekEnd) {
}
