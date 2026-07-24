package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.user.enums.NutritionGoal;

import java.math.BigDecimal;

/**
 * Same rules as FE MacroTargets / Profile health save:
 * WEIGHT_LOSS → target &lt; current; WEIGHT_GAIN / MUSCLE_GAIN → target &gt; current.
 * Used by demo seeds so fixtures are never “ảo” relative to product validation.
 */
public final class GoalWeightConsistency {

    private GoalWeightConsistency() {
    }

    public static void requireConsistent(NutritionGoal goal, BigDecimal currentWeight, BigDecimal targetWeight) {
        if (goal == null || currentWeight == null || targetWeight == null) {
            return;
        }
        if (currentWeight.signum() <= 0 || targetWeight.signum() <= 0) {
            throw new BadRequestException("Cân nặng seed phải > 0");
        }
        switch (goal) {
            case WEIGHT_LOSS -> {
                if (targetWeight.compareTo(currentWeight) >= 0) {
                    throw new BadRequestException(
                            "Seed WEIGHT_LOSS: targetWeight phải < currentWeight (target="
                                    + targetWeight + ", current=" + currentWeight + ")");
                }
            }
            case WEIGHT_GAIN -> {
                if (targetWeight.compareTo(currentWeight) <= 0) {
                    throw new BadRequestException(
                            "Seed WEIGHT_GAIN: targetWeight phải > currentWeight (target="
                                    + targetWeight + ", current=" + currentWeight + ")");
                }
            }
            default -> {
                // MAINTAIN / PREGNANT / RECOVERY: no strict direction rule
            }
        }
    }
}
