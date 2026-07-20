package com.sba.nutricanbe.user.enums;

import java.math.BigDecimal;

/**
 * Harris-Benedict / Mifflin activity multipliers (R in TDEE = BMR × R).
 * Persist enum on User — never store raw factor as free BigDecimal.
 */
public enum ActivityLevel {
    SEDENTARY(new BigDecimal("1.2")),
    LIGHT(new BigDecimal("1.375")),
    MODERATE(new BigDecimal("1.55")),
    ACTIVE(new BigDecimal("1.725")),
    VERY_ACTIVE(new BigDecimal("1.9"));

    private final BigDecimal factor;

    ActivityLevel(BigDecimal factor) {
        this.factor = factor;
    }

    public BigDecimal toFactor() {
        return factor;
    }

    public static ActivityLevel defaultLevel() {
        return MODERATE;
    }

    /** Resolve null → MODERATE. */
    public static ActivityLevel orDefault(ActivityLevel level) {
        return level != null ? level : MODERATE;
    }
}
