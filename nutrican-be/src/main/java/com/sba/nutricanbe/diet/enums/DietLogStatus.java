package com.sba.nutricanbe.diet.enums;

public enum DietLogStatus {
    PENDING_AI,
    DRAFT,
    MANUAL_REQUIRED,
    LOGGED,
    /** Prefer {@link DietLogReviewStatus}. */
    @Deprecated
    PT_REVIEWING,
    /** Prefer {@link DietLogReviewStatus}. */
    @Deprecated
    APPROVED,
    /** Prefer {@link DietLogReviewStatus}. */
    @Deprecated
    REJECTED
}
