package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.diet.enums.ExperimentCohort;
import com.sba.nutricanbe.diet.enums.MealComplexity;
import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.RecognitionSource;
import com.sba.nutricanbe.user.enums.DietPreference;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RblCohortUtilTest {

    @Test
    void resolveKey_appendsDietPreference() {
        String key = RblCohortUtil.resolveKey(
                MealSource.RESTAURANT, MealComplexity.SIMPLE, RecognitionSource.HYBRID, DietPreference.VEGETARIAN);
        assertEquals("RESTAURANT_HYBRID_DB_VEGETARIAN", key);
    }

    @Test
    void resolveKey_defaultsNormal() {
        String key = RblCohortUtil.resolveKey(
                MealSource.HOME_COOKED, MealComplexity.SIMPLE, RecognitionSource.MANUAL, null);
        assertTrue(key.endsWith("_NORMAL"));
    }

    @Test
    void resolve_manualEntry() {
        assertEquals(ExperimentCohort.MANUAL_ENTRY,
                RblCohortUtil.resolve(MealSource.HOME_COOKED, MealComplexity.SIMPLE, RecognitionSource.MANUAL));
    }

    @Test
    void resolve_hotpot() {
        assertEquals(ExperimentCohort.HOTPOT_HYBRID,
                RblCohortUtil.resolve(MealSource.RESTAURANT, MealComplexity.HOTPOT, RecognitionSource.HYBRID));
    }

    @Test
    void resolve_restaurantAiOnly() {
        assertEquals(ExperimentCohort.RESTAURANT_AI_ONLY,
                RblCohortUtil.resolve(MealSource.RESTAURANT, MealComplexity.SIMPLE, RecognitionSource.AI_ONLY));
    }

    @Test
    void resolveKey_veganSuffix() {
        String key = RblCohortUtil.resolveKey(
                MealSource.HOME_COOKED, MealComplexity.SIMPLE, RecognitionSource.HYBRID,
                DietPreference.VEGAN);
        assertEquals("HOME_HYBRID_DB_VEGAN", key);
    }

    @Test
    void resolve_manualRecipeUsesManualEntry() {
        assertEquals(ExperimentCohort.MANUAL_ENTRY,
                RblCohortUtil.resolve(MealSource.HOME_COOKED, MealComplexity.SIMPLE, RecognitionSource.MANUAL_RECIPE));
    }

    @Test
    void resolveKey_ketoPreference() {
        assertTrue(RblCohortUtil.resolveKey(
                MealSource.RESTAURANT, MealComplexity.SIMPLE, RecognitionSource.HYBRID, DietPreference.KETO)
                .endsWith("_KETO"));
    }
}
