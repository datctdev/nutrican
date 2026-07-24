package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.user.enums.NutritionGoal;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class GoalWeightConsistencyTest {

    @Test
    void weightLossRequiresTargetBelowCurrent() {
        assertDoesNotThrow(() -> GoalWeightConsistency.requireConsistent(
                NutritionGoal.WEIGHT_LOSS, bd("71.0"), bd("65")));
        assertThrows(BadRequestException.class, () -> GoalWeightConsistency.requireConsistent(
                NutritionGoal.WEIGHT_LOSS, bd("59.1"), bd("67")));
    }

    @Test
    void weightGainRequiresTargetAboveCurrent() {
        assertDoesNotThrow(() -> GoalWeightConsistency.requireConsistent(
                NutritionGoal.WEIGHT_GAIN, bd("59.1"), bd("67")));
        assertThrows(BadRequestException.class, () -> GoalWeightConsistency.requireConsistent(
                NutritionGoal.WEIGHT_GAIN, bd("71.0"), bd("65")));
    }

    @Test
    void maintainAllowsAnyDirection() {
        assertDoesNotThrow(() -> GoalWeightConsistency.requireConsistent(
                NutritionGoal.MAINTAIN, bd("63.1"), bd("63")));
    }

    private static BigDecimal bd(String v) {
        return new BigDecimal(v);
    }
}
