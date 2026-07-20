package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.diet.enums.MealPeriod;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class MealPeriodsTest {

    @Test
    void isMealPeriodOpen_tomorrowEvening_false() {
        LocalDateTime tonight = LocalDateTime.of(2026, 7, 20, 19, 0);
        LocalDate tomorrow = LocalDate.of(2026, 7, 21);
        assertFalse(MealPeriods.isMealPeriodOpen(tomorrow, MealPeriod.EVENING, tonight));
    }

    @Test
    void isMealPeriodOpen_lateCrossMidnight_yesterdayAt1am_true() {
        LocalDateTime at1am = LocalDateTime.of(2026, 7, 21, 1, 0);
        LocalDate yesterday = LocalDate.of(2026, 7, 20);
        assertTrue(MealPeriods.isMealPeriodOpen(yesterday, MealPeriod.LATE, at1am));
    }

    @Test
    void isMealPeriodOpen_lateYesterdayAt5am_false() {
        LocalDateTime at5am = LocalDateTime.of(2026, 7, 21, 5, 0);
        LocalDate yesterday = LocalDate.of(2026, 7, 20);
        assertFalse(MealPeriods.isMealPeriodOpen(yesterday, MealPeriod.LATE, at5am));
    }

    @Test
    void isMealPeriodOpen_lateTodayBefore22_false() {
        LocalDateTime at21 = LocalDateTime.of(2026, 7, 20, 21, 0);
        LocalDate today = LocalDate.of(2026, 7, 20);
        assertFalse(MealPeriods.isMealPeriodOpen(today, MealPeriod.LATE, at21));
    }

    @Test
    void isMealPeriodOpen_lateTodayAt23_true() {
        LocalDateTime at23 = LocalDateTime.of(2026, 7, 20, 23, 0);
        LocalDate today = LocalDate.of(2026, 7, 20);
        assertTrue(MealPeriods.isMealPeriodOpen(today, MealPeriod.LATE, at23));
    }

    @Test
    void isMealPeriodOpen_morningAtMorning_true() {
        LocalDateTime at9 = LocalDateTime.of(2026, 7, 20, 9, 30);
        LocalDate today = LocalDate.of(2026, 7, 20);
        assertTrue(MealPeriods.isMealPeriodOpen(today, MealPeriod.MORNING, at9));
    }

    @Test
    void isMealPeriodOpen_nullPeriod_false() {
        assertFalse(MealPeriods.isMealPeriodOpen(LocalDate.of(2026, 7, 20), null,
                LocalDateTime.of(2026, 7, 20, 12, 0)));
    }

    @Test
    void validateMakeup_current_rejected() {
        // At noon, makeup=NOON (current) should fail — depends on wall clock; use pastPeriods logic directly
        assertTrue(MealPeriods.pastPeriods(MealPeriod.NOON, LocalDateTime.of(2026, 7, 20, 12, 0))
                .contains(MealPeriod.MORNING));
        assertFalse(MealPeriods.pastPeriods(MealPeriod.NOON, LocalDateTime.of(2026, 7, 20, 12, 0))
                .contains(MealPeriod.NOON));
    }

    @Test
    void pastPeriods_before4am_empty() {
        assertTrue(MealPeriods.pastPeriods(MealPeriod.LATE, LocalDateTime.of(2026, 7, 21, 1, 30)).isEmpty());
    }

    @Test
    void isPastPeriodForLateTick_afternoon_eveningAndLate_false() {
        LocalDateTime afternoon = LocalDateTime.of(2026, 7, 20, 15, 0);
        assertTrue(MealPeriods.isPastPeriodForLateTick(MealPeriod.MORNING, afternoon));
        assertTrue(MealPeriods.isPastPeriodForLateTick(MealPeriod.NOON, afternoon));
        assertFalse(MealPeriods.isPastPeriodForLateTick(MealPeriod.AFTERNOON, afternoon));
        assertFalse(MealPeriods.isPastPeriodForLateTick(MealPeriod.EVENING, afternoon));
        assertFalse(MealPeriods.isPastPeriodForLateTick(MealPeriod.LATE, afternoon));
    }

    @Test
    void isPastPeriodForLateTick_evening_lateStillFuture() {
        LocalDateTime evening = LocalDateTime.of(2026, 7, 20, 19, 0);
        assertTrue(MealPeriods.isPastPeriodForLateTick(MealPeriod.AFTERNOON, evening));
        assertFalse(MealPeriods.isPastPeriodForLateTick(MealPeriod.EVENING, evening));
        assertFalse(MealPeriods.isPastPeriodForLateTick(MealPeriod.LATE, evening));
    }

    @Test
    void fromMinutes_windows() {
        assertEquals(MealPeriod.MORNING, MealPeriods.fromMinutes(4 * 60));
        assertEquals(MealPeriod.NOON, MealPeriods.fromMinutes(11 * 60));
        assertEquals(MealPeriod.AFTERNOON, MealPeriods.fromMinutes(13 * 60));
        assertEquals(MealPeriod.EVENING, MealPeriods.fromMinutes(18 * 60));
        assertEquals(MealPeriod.LATE, MealPeriods.fromMinutes(22 * 60));
        assertEquals(MealPeriod.LATE, MealPeriods.fromMinutes(1 * 60));
    }
}
