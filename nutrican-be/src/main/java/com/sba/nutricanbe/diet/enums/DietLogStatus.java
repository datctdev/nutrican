package com.sba.nutricanbe.diet.enums;

public enum DietLogStatus {
    PENDING_AI,
    DRAFT,
    MANUAL_REQUIRED,
    LOGGED,
    /** @deprecated Legacy v2 — use {@link com.sba.nutricanbe.diet.enums.DietLogReviewStatus} instead */
    @Deprecated
    PT_REVIEWING,
    /** @deprecated Legacy v2 — use {@link com.sba.nutricanbe.diet.enums.DietLogReviewStatus} instead */
    @Deprecated
    APPROVED,
    /** @deprecated Legacy v2 — use {@link com.sba.nutricanbe.diet.enums.DietLogReviewStatus} instead */
    @Deprecated
    REJECTED
}
