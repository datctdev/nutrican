package com.sba.nutricanbe.user.enums;

import java.math.BigDecimal;


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


    public static ActivityLevel orDefault(ActivityLevel level) {
        return level != null ? level : MODERATE;
    }
}
