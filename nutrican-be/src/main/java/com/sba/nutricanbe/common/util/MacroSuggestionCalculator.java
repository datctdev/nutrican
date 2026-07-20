package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.user.dto.MacroSuggestionResponse;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ActivityLevel;
import com.sba.nutricanbe.user.enums.NutritionGoal;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;

public final class MacroSuggestionCalculator {

    private static final BigDecimal DEFAULT_WEIGHT = BigDecimal.valueOf(70);
    private static final BigDecimal DEFAULT_HEIGHT = BigDecimal.valueOf(170);
    private static final int DEFAULT_AGE = 30;

    private MacroSuggestionCalculator() {
    }

    public static BigDecimal resolveFactor(ActivityLevel level, BigDecimal legacyFactor) {
        if (level != null) {
            return level.toFactor();
        }
        if (legacyFactor != null) {
            return legacyFactor;
        }
        return ActivityLevel.defaultLevel().toFactor();
    }

    public static ActivityLevel resolveLevel(User user) {
        return ActivityLevel.orDefault(user != null ? user.getActivityLevel() : null);
    }

    public static MacroSuggestionResponse calculate(
            User user,
            BigDecimal weightKg,
            BigDecimal heightCm,
            Integer age,
            String gender,
            BigDecimal activityFactor,
            NutritionGoal nutritionGoal,
            Integer pregnancyTrimester) {
        BigDecimal w = weightKg != null && weightKg.compareTo(BigDecimal.ZERO) > 0 ? weightKg : DEFAULT_WEIGHT;
        BigDecimal h = heightCm != null && heightCm.compareTo(BigDecimal.ZERO) > 0 ? heightCm : DEFAULT_HEIGHT;
        int a = age != null && age > 0 ? age : resolveAge(user);
        String g = gender != null && !gender.isBlank() ? gender : "male";
        BigDecimal factor = activityFactor != null ? activityFactor : resolveLevel(user).toFactor();

        BigDecimal bmr;
        if ("female".equalsIgnoreCase(g)) {
            bmr = BigDecimal.valueOf(10).multiply(w)
                    .add(BigDecimal.valueOf(6.25).multiply(h))
                    .subtract(BigDecimal.valueOf(5).multiply(BigDecimal.valueOf(a)))
                    .subtract(BigDecimal.valueOf(161));
        } else {
            bmr = BigDecimal.valueOf(10).multiply(w)
                    .add(BigDecimal.valueOf(6.25).multiply(h))
                    .subtract(BigDecimal.valueOf(5).multiply(BigDecimal.valueOf(a)))
                    .add(BigDecimal.valueOf(5));
        }
        BigDecimal tdee = bmr.multiply(factor).setScale(0, RoundingMode.HALF_UP);
        NutritionGoal goal = nutritionGoal != null ? nutritionGoal
                : (user != null && user.getNutritionGoal() != null ? user.getNutritionGoal() : NutritionGoal.MAINTAIN);
        int trimester = pregnancyTrimester != null ? pregnancyTrimester
                : (user != null && user.getPregnancyTrimester() != null ? user.getPregnancyTrimester() : 1);
        BigDecimal calories = switch (goal) {
            case WEIGHT_LOSS -> tdee.subtract(BigDecimal.valueOf(400));
            case WEIGHT_GAIN -> tdee.add(BigDecimal.valueOf(300));
            case PREGNANT -> tdee.add(BigDecimal.valueOf(trimester == 3 ? 450 : 300));
            case RECOVERY -> tdee.add(BigDecimal.valueOf(200));
            default -> tdee;
        };
        BigDecimal protein = w.multiply(BigDecimal.valueOf(
                goal == NutritionGoal.WEIGHT_GAIN ? 2.0 : 1.6)).setScale(0, RoundingMode.HALF_UP);
        BigDecimal fat = calories.multiply(BigDecimal.valueOf(0.25))
                .divide(BigDecimal.valueOf(9), 0, RoundingMode.HALF_UP);
        BigDecimal carb = calories.subtract(protein.multiply(BigDecimal.valueOf(4)))
                .subtract(fat.multiply(BigDecimal.valueOf(9)))
                .divide(BigDecimal.valueOf(4), 0, RoundingMode.HALF_UP);
        return MacroSuggestionResponse.builder()
                .dailyCalories(calories.max(BigDecimal.valueOf(1200)))
                .protein(protein)
                .carb(carb.max(BigDecimal.ZERO))
                .fat(fat)
                .note("Gợi ý tham khảo — PT có thể điều chỉnh")
                .build();
    }

    private static int resolveAge(User user) {
        if (user != null && user.getDateOfBirth() != null) {
            return Period.between(user.getDateOfBirth(), LocalDate.now()).getYears();
        }
        return DEFAULT_AGE;
    }
}
