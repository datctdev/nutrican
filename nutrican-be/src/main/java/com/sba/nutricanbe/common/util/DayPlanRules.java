package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.entity.SelfPlanItem;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealPlanItemSourceType;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

/**
 * Shared day-plan rules for meal-period settlement (customer + PT).
 */
public final class DayPlanRules {

    private DayPlanRules() {}

    public static boolean isMealPeriodSettled(
            LocalDate planDate,
            MealPeriod mealPeriod,
            List<MealPlanItem> ptItems,
            List<SelfPlanItem> selfItems,
            List<DietLog> logs) {
        if (planDate == null || mealPeriod == null) {
            return false;
        }
        if (hasLoggedMealPeriod(logs, planDate, mealPeriod)) {
            return true;
        }
        List<MealPlanItem> periodPt = ptItems == null ? List.of() : ptItems.stream()
                .filter(i -> planDate.equals(i.getPlanDate()) && mealPeriod.equals(i.getMealPeriod()))
                .toList();
        if (!periodPt.isEmpty()) {
            boolean anyEaten = periodPt.stream().anyMatch(i -> Boolean.TRUE.equals(i.getEaten()));
            if (anyEaten) {
                return true;
            }
            boolean allSkipped = periodPt.stream().allMatch(i -> i.getSkipReason() != null);
            if (allSkipped) {
                return true;
            }
        }
        if (selfItems != null) {
            boolean selfEaten = selfItems.stream()
                    .filter(i -> planDate.equals(i.getPlanDate()) && mealPeriod.equals(i.getMealPeriod()))
                    .anyMatch(i -> Boolean.TRUE.equals(i.getEaten()));
            if (selfEaten) {
                return true;
            }
        }
        return false;
    }

    public static boolean isMealPeriodSettledFromPtAndLogs(
            LocalDate planDate,
            MealPeriod mealPeriod,
            Collection<MealPlanItem> ptItems,
            Collection<DietLog> logs) {
        return isMealPeriodSettled(planDate, mealPeriod,
                ptItems == null ? List.of() : List.copyOf(ptItems),
                List.of(),
                logs == null ? List.of() : List.copyOf(logs));
    }

    private static boolean hasLoggedMealPeriod(List<DietLog> logs, LocalDate planDate, MealPeriod mealPeriod) {
        if (logs == null) {
            return false;
        }
        return logs.stream()
                .filter(log -> log.getStatus() == DietLogStatus.LOGGED)
                .filter(log -> planDate.equals(log.getLogDate()))
                .filter(log -> mealPeriod.equals(log.getMealPeriod()))
                .anyMatch(DayPlanRules::countsAsActualIntake);
    }

    /** Chờ PT duyệt nhật ký không được coi là buổi đã chốt. */
    private static boolean countsAsActualIntake(DietLog log) {
        DietLogReviewStatus reviewStatus = log.getReviewStatus();
        return reviewStatus == null
                || reviewStatus == DietLogReviewStatus.NOT_REQUIRED
                || reviewStatus == DietLogReviewStatus.APPROVED;
    }

    public static boolean isPtPlanItem(MealPlanItem item) {
        return item != null && (item.getSourceType() == null
                || item.getSourceType() == MealPlanItemSourceType.PT_ORIGINAL
                || item.getSourceType() == MealPlanItemSourceType.SELF_OVERRIDE);
    }
}
