package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.diet.enums.MealPeriod;

import java.util.EnumMap;
import java.util.Map;

public final class MealPeriodLabels {

    private static final Map<MealPeriod, String> VI = new EnumMap<>(MealPeriod.class);

    static {
        VI.put(MealPeriod.MORNING, "Buổi sáng");
        VI.put(MealPeriod.NOON, "Buổi trưa");
        VI.put(MealPeriod.AFTERNOON, "Buổi chiều");
        VI.put(MealPeriod.EVENING, "Buổi tối");
        VI.put(MealPeriod.LATE, "Buổi khuya");
    }

    private MealPeriodLabels() {}

    public static String labelVi(MealPeriod period) {
        if (period == null) {
            return "";
        }
        return VI.getOrDefault(period, period.name());
    }
}
