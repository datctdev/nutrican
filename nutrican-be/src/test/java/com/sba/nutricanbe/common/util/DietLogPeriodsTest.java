package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.diet.dto.response.DietLogResponse;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealType;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DietLogPeriodsTest {

    @Test
    void resolveLogMealPeriod_usesMealPeriodWhenPresent() {
        DietLog log = DietLog.builder().mealPeriod(MealPeriod.EVENING).build();
        assertEquals(MealPeriod.EVENING, DietLogPeriods.resolveLogMealPeriod(log));
    }

    @Test
    void resolveLogMealPeriod_fallsBackToMealType() {
        DietLogResponse log = DietLogResponse.builder().mealType(MealType.BREAKFAST).build();
        assertEquals(MealPeriod.MORNING, DietLogPeriods.resolveLogMealPeriod(log));
    }
}
