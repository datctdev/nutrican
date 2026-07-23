package com.sba.nutricanbe.common.util;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class CoachingWeeksTest {

    @Test
    void from_nullStartedAt_unavailable() {
        LocalDate today = LocalDate.of(2026, 7, 22);
        CoachingWeeks.Window w = CoachingWeeks.from((LocalDateTime) null, today);
        assertFalse(w.available());
        assertNull(w.weekStart());
    }

    @Test
    void from_futureStartedAt_unavailable() {
        LocalDate today = LocalDate.of(2026, 7, 22);
        CoachingWeeks.Window w = CoachingWeeks.from(LocalDate.of(2026, 7, 25), today);
        assertFalse(w.available());
        assertFalse(CoachingWeeks.canSubmitSummary(LocalDate.of(2026, 7, 25),
                LocalDate.of(2026, 7, 25), today));
    }

    @Test
    void canSubmitSummary_todayEqualsWeekEnd_false() {
        LocalDate start = LocalDate.of(2026, 7, 1);
        LocalDate weekStart = LocalDate.of(2026, 7, 1);
        LocalDate weekEnd = weekStart.plusDays(6); // Jul 7
        assertFalse(CoachingWeeks.canSubmitSummary(start, weekStart, weekEnd));
    }

    @Test
    void canSubmitSummary_todayEqualsWeekEndPlusOne_true() {
        LocalDate start = LocalDate.of(2026, 7, 1);
        LocalDate weekStart = LocalDate.of(2026, 7, 1);
        LocalDate weekEnd = weekStart.plusDays(6); // Jul 7
        assertTrue(CoachingWeeks.canSubmitSummary(start, weekStart, weekEnd.plusDays(1)));
    }

    @Test
    void canSubmitSummary_mismatchedWeekStart_false() {
        LocalDate start = LocalDate.of(2026, 7, 1);
        LocalDate today = LocalDate.of(2026, 7, 15);
        // Jul 2 is not a coaching-week boundary from Jul 1
        assertFalse(CoachingWeeks.canSubmitSummary(start, LocalDate.of(2026, 7, 2), today));
    }

    @Test
    void from_crossMonthStartDec28() {
        LocalDate start = LocalDate.of(2025, 12, 28);
        // day 0..6 = week 0 (Dec 28 – Jan 3)
        CoachingWeeks.Window week0 = CoachingWeeks.from(start, LocalDate.of(2026, 1, 3));
        assertTrue(week0.available());
        assertEquals(0, week0.weekIndex());
        assertEquals(LocalDate.of(2025, 12, 28), week0.weekStart());
        assertEquals(LocalDate.of(2026, 1, 3), week0.weekEnd());

        // day 7 = week 1 starts Jan 4
        CoachingWeeks.Window week1 = CoachingWeeks.from(start, LocalDate.of(2026, 1, 4));
        assertEquals(1, week1.weekIndex());
        assertEquals(LocalDate.of(2026, 1, 4), week1.weekStart());
        assertEquals(LocalDate.of(2026, 1, 10), week1.weekEnd());

        assertFalse(CoachingWeeks.canSubmitSummary(start, week0.weekStart(), LocalDate.of(2026, 1, 3)));
        assertTrue(CoachingWeeks.canSubmitSummary(start, week0.weekStart(), LocalDate.of(2026, 1, 4)));
    }
}
