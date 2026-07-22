package com.sba.nutricanbe.diet.enums;

/**
 * Lifecycle of a diet log entry.
 * PT review is tracked separately via {@link DietLogReviewStatus}.
 */
public enum DietLogStatus {
    PENDING_AI,
    DRAFT,
    MANUAL_REQUIRED,
    LOGGED
}
