package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.common.exception.BadRequestException;

import java.math.BigDecimal;

/**
 * Ensures macro grams convert to calories within ±50 kcal of the daily calorie target.
 */
public final class MacroCalorieValidator {

    public static final BigDecimal TOLERANCE_KCAL = BigDecimal.valueOf(50);
    private static final BigDecimal KCAL_PER_G_PROTEIN = BigDecimal.valueOf(4);
    private static final BigDecimal KCAL_PER_G_CARB = BigDecimal.valueOf(4);
    private static final BigDecimal KCAL_PER_G_FAT = BigDecimal.valueOf(9);

    private MacroCalorieValidator() {}

    /**
     * Validates when all four values are present. No-op if any is null (partial update).
     */
    public static void validateWithinTolerance(
            BigDecimal dailyCalories, BigDecimal protein, BigDecimal carb, BigDecimal fat) {
        if (dailyCalories == null || protein == null || carb == null || fat == null) {
            return;
        }
        BigDecimal fromMacros = protein.multiply(KCAL_PER_G_PROTEIN)
                .add(carb.multiply(KCAL_PER_G_CARB))
                .add(fat.multiply(KCAL_PER_G_FAT));
        BigDecimal diff = fromMacros.subtract(dailyCalories).abs();
        if (diff.compareTo(TOLERANCE_KCAL) > 0) {
            throw new BadRequestException(
                    "Tổng calo từ đạm/carb/béo (P×4 + C×4 + F×9) phải lệch không quá ±50 kcal so với calo ngày. "
                            + "Hiện tại lệch " + diff.setScale(0, java.math.RoundingMode.HALF_UP) + " kcal — vui lòng điều chỉnh lại.");
        }
    }
}
