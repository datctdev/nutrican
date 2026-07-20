package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.entity.SelfPlanItem;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealPlanSkipReason;
import com.sba.nutricanbe.diet.enums.MealType;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DayPlanRulesTest {

    private static final LocalDate DAY = LocalDate.of(2026, 7, 20);

    @Test
    void settledWhenPtItemEatenInPeriod() {
        MealPlanItem ptAfternoon = MealPlanItem.builder()
                .planDate(DAY)
                .mealPeriod(MealPeriod.AFTERNOON)
                .mealType(MealType.SNACK)
                .eaten(true)
                .build();
        assertTrue(DayPlanRules.isMealPeriodSettled(
                DAY, MealPeriod.AFTERNOON, List.of(ptAfternoon), List.of(), List.of()));
    }

    @Test
    void settledWhenDietLogInPeriod() {
        DietLog log = DietLog.builder()
                .logDate(DAY)
                .mealPeriod(MealPeriod.MORNING)
                .status(DietLogStatus.LOGGED)
                .build();
        assertTrue(DayPlanRules.isMealPeriodSettled(
                DAY, MealPeriod.MORNING, List.of(), List.of(), List.of(log)));
    }

    @Test
    void settledWhenAllPtSkipped() {
        MealPlanItem skipped = MealPlanItem.builder()
                .planDate(DAY)
                .mealPeriod(MealPeriod.EVENING)
                .mealType(MealType.DINNER)
                .skipReason(MealPlanSkipReason.DONT_LIKE)
                .build();
        assertTrue(DayPlanRules.isMealPeriodSettled(
                DAY, MealPeriod.EVENING, List.of(skipped), List.of(), List.of()));
    }

    @Test
    void notSettledWhenEveningDraftOnly() {
        SelfPlanItem self = SelfPlanItem.builder()
                .planDate(DAY)
                .mealPeriod(MealPeriod.EVENING)
                .mealType(MealType.DINNER)
                .eaten(false)
                .build();
        assertFalse(DayPlanRules.isMealPeriodSettled(
                DAY, MealPeriod.EVENING, List.of(), List.of(self), List.of()));
    }
}
