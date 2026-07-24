package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.user.enums.ActivityLevel;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ActivityLoadMapperTest {

    @Test
    void threeSessionsFortyMinutes_isModerate() {
        assertEquals(ActivityLevel.MODERATE, ActivityLoadMapper.toLevel(3, 40));
    }

    @Test
    void threeSessionsThreeHundredMinutes_isVeryActive() {
        assertEquals(ActivityLevel.VERY_ACTIVE, ActivityLoadMapper.toLevel(3, 300));
    }

    @Test
    void sevenSessionsFiftyMinutes_isActive() {
        assertEquals(ActivityLevel.ACTIVE, ActivityLoadMapper.toLevel(7, 50));
    }

    @Test
    void zeroSessionsZeroMinutes_isSedentary() {
        assertEquals(ActivityLevel.SEDENTARY, ActivityLoadMapper.toLevel(0, 0));
    }

    @Test
    void zeroSessionsWithMinutes_rejected() {
        assertThrows(BadRequestException.class, () -> ActivityLoadMapper.toLevel(0, 60));
    }

    @Test
    void resolvePrefersSessionsOverEnum() {
        assertEquals(
                ActivityLevel.VERY_ACTIVE,
                ActivityLoadMapper.resolveLevel(ActivityLevel.SEDENTARY, 3, 300));
    }

    @Test
    void resolveFallsBackToEnum() {
        assertEquals(
                ActivityLevel.LIGHT,
                ActivityLoadMapper.resolveLevel(ActivityLevel.LIGHT, null, null));
    }
}
