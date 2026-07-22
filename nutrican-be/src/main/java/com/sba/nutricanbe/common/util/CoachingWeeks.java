package com.sba.nutricanbe.common.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Coaching week windows anchored at {@code coachingStartedAt} (rolling 7-day blocks).
 * Always pass {@link DietDates#todayVn()} as {@code todayVn} — never {@link LocalDate#now()}.
 */
public final class CoachingWeeks {

    private CoachingWeeks() {}

    public record Window(boolean available, int weekIndex, LocalDate weekStart, LocalDate weekEnd) {
        public static Window unavailable() {
            return new Window(false, -1, null, null);
        }
    }

    public static Window from(LocalDateTime startedAt, LocalDate todayVn) {
        if (startedAt == null) {
            return Window.unavailable();
        }
        return from(startedAt.toLocalDate(), todayVn);
    }

    public static Window from(LocalDate startedAt, LocalDate todayVn) {
        if (startedAt == null || todayVn == null || startedAt.isAfter(todayVn)) {
            return Window.unavailable();
        }
        long daysBetween = ChronoUnit.DAYS.between(startedAt, todayVn);
        int weekIndex = (int) (daysBetween / 7);
        LocalDate weekStart = startedAt.plusDays(7L * weekIndex);
        LocalDate weekEnd = weekStart.plusDays(6);
        return new Window(true, weekIndex, weekStart, weekEnd);
    }

    /**
     * Whether a weekly summary for {@code weekStartDate} may be submitted.
     * Requires coaching available, {@code weekStartDate} on a valid boundary
     * ({@code start + 7*i}), and {@code todayVn >= weekEnd + 1}.
     */
    public static boolean canSubmitSummary(LocalDateTime startedAt, LocalDate weekStartDate, LocalDate todayVn) {
        if (startedAt == null) {
            return false;
        }
        return canSubmitSummary(startedAt.toLocalDate(), weekStartDate, todayVn);
    }

    public static boolean canSubmitSummary(LocalDate startedAt, LocalDate weekStartDate, LocalDate todayVn) {
        if (startedAt == null || weekStartDate == null || todayVn == null) {
            return false;
        }
        if (startedAt.isAfter(todayVn)) {
            return false;
        }
        if (weekStartDate.isBefore(startedAt)) {
            return false;
        }
        long offsetDays = ChronoUnit.DAYS.between(startedAt, weekStartDate);
        if (offsetDays % 7 != 0) {
            return false;
        }
        LocalDate weekEnd = weekStartDate.plusDays(6);
        return !todayVn.isBefore(weekEnd.plusDays(1));
    }
}
