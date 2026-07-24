package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.entity.SelfPlanItem;
import com.sba.nutricanbe.diet.enums.MealPeriod;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

/**
 * @deprecated Use {@link com.sba.nutricanbe.diet.util.DayPlanRules} — kept as re-export so old imports keep compiling.
 */
@Deprecated
public final class DayPlanRules {

    private DayPlanRules() {}

    public static boolean isMealPeriodSettled(
            LocalDate planDate,
            MealPeriod mealPeriod,
            List<MealPlanItem> ptItems,
            List<SelfPlanItem> selfItems,
            List<DietLog> logs) {
        return com.sba.nutricanbe.diet.util.DayPlanRules.isMealPeriodSettled(
                planDate, mealPeriod, ptItems, selfItems, logs);
    }

    public static boolean isMealPeriodSettledFromPtAndLogs(
            LocalDate planDate,
            MealPeriod mealPeriod,
            Collection<MealPlanItem> ptItems,
            Collection<DietLog> logs) {
        return com.sba.nutricanbe.diet.util.DayPlanRules.isMealPeriodSettledFromPtAndLogs(
                planDate, mealPeriod, ptItems, logs);
    }

    public static boolean isPtPlanItem(MealPlanItem item) {
        return com.sba.nutricanbe.diet.util.DayPlanRules.isPtPlanItem(item);
    }
}
