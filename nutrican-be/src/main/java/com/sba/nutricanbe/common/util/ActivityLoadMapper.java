package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.user.enums.ActivityLevel;

/**
 * Maps exercise sessions/week + minutes/session to {@link ActivityLevel}.
 * finalLevel = max(levelFromSessions, levelFromMinutes); sessions==0 → SEDENTARY (minutes must be 0).
 */
public final class ActivityLoadMapper {

    public static final int MAX_SESSIONS = 14;
    public static final int MAX_MINUTES = 300;

    private ActivityLoadMapper() {
    }

    public static ActivityLevel toLevel(Integer sessionsPerWeek, Integer minutesPerSession) {
        validate(sessionsPerWeek, minutesPerSession);
        int sessions = sessionsPerWeek != null ? sessionsPerWeek : 0;
        int minutes = minutesPerSession != null ? minutesPerSession : 0;
        if (sessions == 0) {
            return ActivityLevel.SEDENTARY;
        }
        return ActivityLevel.values()[Math.max(levelFromSessions(sessions), levelFromMinutes(minutes)) - 1];
    }

    public static void validate(Integer sessionsPerWeek, Integer minutesPerSession) {
        if (sessionsPerWeek == null && minutesPerSession == null) {
            throw new BadRequestException("sessionsPerWeek and minutesPerSession are required together");
        }
        if (sessionsPerWeek == null || minutesPerSession == null) {
            throw new BadRequestException("Cần nhập cả số buổi/tuần và phút/buổi");
        }
        if (sessionsPerWeek < 0 || sessionsPerWeek > MAX_SESSIONS) {
            throw new BadRequestException("sessionsPerWeek phải từ 0 đến " + MAX_SESSIONS);
        }
        if (minutesPerSession < 0 || minutesPerSession > MAX_MINUTES) {
            throw new BadRequestException("minutesPerSession phải từ 0 đến " + MAX_MINUTES);
        }
        if (sessionsPerWeek == 0 && minutesPerSession != 0) {
            throw new BadRequestException("Khi 0 buổi/tuần, phút/buổi phải bằng 0");
        }
    }

    public static boolean hasSessionInputs(Integer sessionsPerWeek, Integer minutesPerSession) {
        return sessionsPerWeek != null || minutesPerSession != null;
    }

    /**
     * Prefer sessions+minutes when present; otherwise fall back to explicit enum (compat).
     */
    public static ActivityLevel resolveLevel(
            ActivityLevel activityLevel,
            Integer sessionsPerWeek,
            Integer minutesPerSession) {
        if (hasSessionInputs(sessionsPerWeek, minutesPerSession)) {
            return toLevel(sessionsPerWeek, minutesPerSession);
        }
        if (activityLevel != null) {
            return activityLevel;
        }
        throw new BadRequestException(
                "Cần activityLevel hoặc cặp sessionsPerWeek + minutesPerSession");
    }

    static int levelFromSessions(int sessions) {
        if (sessions <= 1) return 1;
        if (sessions <= 3) return 2;
        if (sessions <= 5) return 3;
        if (sessions <= 7) return 4;
        return 5;
    }

    static int levelFromMinutes(int minutes) {
        if (minutes < 15) return 1;
        if (minutes <= 30) return 2;
        if (minutes <= 45) return 3;
        if (minutes <= 60) return 4;
        return 5;
    }
}
