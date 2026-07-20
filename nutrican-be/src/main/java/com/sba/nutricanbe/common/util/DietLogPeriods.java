package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.diet.dto.response.DietLogResponse;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealType;

/**
 * Mirrors FE {@code resolveLogMealPeriod} in dietUtils.js for consistent grouping.
 */
public final class DietLogPeriods {

    private DietLogPeriods() {}

    public static MealPeriod resolveLogMealPeriod(DietLog log) {
        if (log == null) {
            return MealPeriod.AFTERNOON;
        }
        if (log.getMealPeriod() != null) {
            return log.getMealPeriod();
        }
        return deriveFromMealType(log.getMealType());
    }

    public static MealPeriod resolveLogMealPeriod(DietLogResponse log) {
        if (log == null) {
            return MealPeriod.AFTERNOON;
        }
        if (log.getMealPeriod() != null) {
            return log.getMealPeriod();
        }
        return deriveFromMealType(log.getMealType());
    }

    private static MealPeriod deriveFromMealType(MealType mealType) {
        if (mealType == null) {
            return MealPeriod.AFTERNOON;
        }
        return switch (mealType) {
            case BREAKFAST -> MealPeriod.MORNING;
            case LUNCH -> MealPeriod.NOON;
            case DINNER -> MealPeriod.EVENING;
            case SNACK -> MealPeriod.AFTERNOON;
        };
    }
}
