package com.sba.nutricanbe.diet.enums;

/**
 * Five Vietnam meal windows (UI/API). Distinct from {@link MealType} which collapses
 * AFTERNOON and LATE into SNACK.
 */
public enum MealPeriod {
    MORNING,
    NOON,
    AFTERNOON,
    EVENING,
    LATE
}
