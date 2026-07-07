package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.diet.enums.ExperimentCohort;
import com.sba.nutricanbe.diet.enums.MealComplexity;
import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.RecognitionSource;
import com.sba.nutricanbe.user.enums.DietPreference;

public final class RblCohortUtil {

    private RblCohortUtil() {}

    public static ExperimentCohort resolve(MealSource mealSource, MealComplexity mealComplexity,
                                           RecognitionSource recognitionSource) {
        if (recognitionSource == RecognitionSource.MANUAL
                || recognitionSource == RecognitionSource.MANUAL_RECIPE) {
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

    public static String resolveKey(MealSource mealSource, MealComplexity mealComplexity,
                                    RecognitionSource recognitionSource, DietPreference preference) {
        String base = resolve(mealSource, mealComplexity, recognitionSource).name();
        String pref = preference != null ? preference.name() : DietPreference.NORMAL.name();
        return base + "_" + pref;
    }
}
