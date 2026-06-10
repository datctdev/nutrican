package com.sba.nutrican_be.core.util;

import com.sba.nutrican_be.core.enums.ExperimentCohort;
import com.sba.nutrican_be.core.enums.MealComplexity;
import com.sba.nutrican_be.core.enums.MealSource;
import com.sba.nutrican_be.core.enums.RecognitionSource;

public final class RblCohortUtil {

    private RblCohortUtil() {}

    public static ExperimentCohort resolve(MealSource mealSource, MealComplexity mealComplexity,
                                           RecognitionSource recognitionSource) {
        if (recognitionSource == RecognitionSource.MANUAL) {
            return ExperimentCohort.MANUAL_ENTRY;
        }
        if (mealComplexity == MealComplexity.HOTPOT) {
            return ExperimentCohort.HOTPOT_HYBRID;
        }
        if (mealComplexity == MealComplexity.COMPOSITE) {
            return ExperimentCohort.COMPOSITE_BUFFET;
        }
        boolean eatingOut = mealSource != null && mealSource != MealSource.HOME_COOKED;
        if (eatingOut && recognitionSource == RecognitionSource.AI_ONLY) {
            return ExperimentCohort.RESTAURANT_AI_ONLY;
        }
        if (eatingOut && recognitionSource == RecognitionSource.HYBRID) {
            return ExperimentCohort.RESTAURANT_HYBRID_DB;
        }
        if (mealSource == MealSource.HOME_COOKED && recognitionSource == RecognitionSource.HYBRID) {
            return ExperimentCohort.HOME_HYBRID_DB;
        }
        if (recognitionSource == RecognitionSource.AI_ONLY) {
            return ExperimentCohort.AI_ONLY_BASELINE;
        }
        return ExperimentCohort.OTHER;
    }
}
