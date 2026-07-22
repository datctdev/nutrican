package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;


public final class MealPeriods {

    private static final MealPeriod[] ORDER = MealPeriod.values();

    private MealPeriods() {}

    public static MealType toMealType(MealPeriod period) {
        if (period == null) {
            return MealType.SNACK;
        }
        return switch (period) {
            case MORNING -> MealType.BREAKFAST;
            case NOON -> MealType.LUNCH;
            case AFTERNOON, LATE -> MealType.SNACK;
            case EVENING -> MealType.DINNER;
        };
    }

    public static MealPeriod fromMinutes(int minutesOfDay) {
        int m = ((minutesOfDay % (24 * 60)) + (24 * 60)) % (24 * 60);
        if (m >= 4 * 60 && m < 11 * 60) return MealPeriod.MORNING;
        if (m >= 11 * 60 && m < 13 * 60) return MealPeriod.NOON;
        if (m >= 13 * 60 && m < 18 * 60) return MealPeriod.AFTERNOON;
        if (m >= 18 * 60 && m < 22 * 60) return MealPeriod.EVENING;
        return MealPeriod.LATE;
    }

    public static MealPeriod current(LocalDateTime nowVn) {
        LocalDateTime n = nowVn != null ? nowVn : DietDates.nowVn();
        return fromMinutes(n.getHour() * 60 + n.getMinute());
    }

    public static MealPeriod current() {
        return current(DietDates.nowVn());
    }

    public static boolean isInWindow(MealPeriod period, LocalDateTime nowVn) {
        if (period == null || nowVn == null) return false;
        return fromMinutes(nowVn.getHour() * 60 + nowVn.getMinute()) == period;
    }


    public static boolean isMealPeriodOpen(LocalDate planDate, MealPeriod period, LocalDateTime nowVn) {
        if (planDate == null || period == null) return false;
        LocalDateTime n = nowVn != null ? nowVn : DietDates.nowVn();
        LocalDate today = n.toLocalDate();
        int hour = n.getHour();

        if (period == MealPeriod.LATE) {
            return (planDate.equals(today) && hour >= 22)
                    || (planDate.equals(today.minusDays(1)) && hour < 4);
        }
        return planDate.equals(today) && isInWindow(period, n);
    }

    public static boolean isMealPeriodOpen(LocalDate planDate, MealPeriod period) {
        return isMealPeriodOpen(planDate, period, DietDates.nowVn());
    }


    public static Set<MealPeriod> pastPeriods(MealPeriod current) {
        return pastPeriods(current, DietDates.nowVn());
    }

    public static Set<MealPeriod> pastPeriods(MealPeriod current, LocalDateTime nowVn) {
        Set<MealPeriod> past = EnumSet.noneOf(MealPeriod.class);
        if (current == null) return past;
        LocalDateTime n = nowVn != null ? nowVn : DietDates.nowVn();
        if (n.getHour() < 4) {
            return past;
        }
        int idx = current.ordinal();
        for (int i = 0; i < idx; i++) {
            past.add(ORDER[i]);
        }
        if (current != MealPeriod.LATE) {
            past.add(MealPeriod.LATE);
        }
        return past;
    }

    public static List<MealPeriod> pastPeriodsList(MealPeriod current) {
        return new ArrayList<>(pastPeriods(current));
    }

    public static Set<MealPeriod> pastTodayPeriods() {
        return pastPeriods(current());
    }


    public static boolean isPastPeriodForLateTick(MealPeriod period, LocalDateTime nowVn) {
        if (period == null) return false;
        LocalDateTime n = nowVn != null ? nowVn : DietDates.nowVn();
        if (n.getHour() < 4) return false;
        MealPeriod current = current(n);
        return period.ordinal() < current.ordinal();
    }

    public static boolean isPastPeriodForLateTick(MealPeriod period) {
        return isPastPeriodForLateTick(period, DietDates.nowVn());
    }


    public static String validateMakeup(MealPeriod mealPeriod, MealPeriod makeup, LocalDate logDate) {
        if (makeup == null) return null;
        LocalDate today = DietDates.todayVn();
        if (logDate == null || !logDate.equals(today)) {
            return "Chỉ được gắn buổi bù cho nhật ký hôm nay";
        }
        MealPeriod current = current();
        if (makeup == mealPeriod) {
            return "Buổi bù phải khác khung đang ghi";
        }
        if (makeup == current) {
            return "Không thể bù cho khung hiện tại";
        }
        if (!pastPeriods(current).contains(makeup)) {
            return "Buổi bù phải là khung đã qua trong hôm nay";
        }
        return null;
    }


    public static MealPeriod deriveFromMealType(MealType mealType) {
        if (mealType == null) return null;
        return switch (mealType) {
            case BREAKFAST -> MealPeriod.MORNING;
            case LUNCH -> MealPeriod.NOON;
            case DINNER -> MealPeriod.EVENING;
            case SNACK -> null;
        };
    }

    public static LocalTime windowStart(MealPeriod period) {
        return switch (period) {
            case MORNING -> LocalTime.of(4, 0);
            case NOON -> LocalTime.of(11, 0);
            case AFTERNOON -> LocalTime.of(13, 0);
            case EVENING -> LocalTime.of(18, 0);
            case LATE -> LocalTime.of(22, 0);
        };
    }
}
