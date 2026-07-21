package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.common.exception.BadRequestException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * Business "today" / "now" for diet — Vietnam wall clock, not JVM default.
 * Optional demo override: property {@code nutrican.demo.vn-clock} or request header
 * {@code X-Nutrican-Demo-Vn-Clock} (when {@code nutrican.demo.allow-client-clock=true}).
 */
public final class DietDates {

    public static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    public static final String DEMO_CLOCK_HEADER = "X-Nutrican-Demo-Vn-Clock";

    private static final ThreadLocal<LocalDateTime> REQUEST_OVERRIDE = new ThreadLocal<>();
    private static volatile LocalDateTime fixedOverride;
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm[:ss]");

    private DietDates() {}

    /** Fixed override from application property (startup). Pass null to clear. */
    public static void setFixedOverride(LocalDateTime override) {
        fixedOverride = override;
    }

    public static void setRequestOverride(LocalDateTime override) {
        if (override == null) {
            REQUEST_OVERRIDE.remove();
        } else {
            REQUEST_OVERRIDE.set(override);
        }
    }

    public static void clearRequestOverride() {
        REQUEST_OVERRIDE.remove();
    }

    /**
     * Parse demo clock: {@code HH:mm}, {@code HH:mm:ss}, or {@code yyyy-MM-dd'T'HH:mm[:ss]} (VN wall).
     * Bare time uses the real VN calendar date.
     */
    public static LocalDateTime parseDemoClock(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String value = raw.trim();
        try {
            if (value.length() <= 8 && value.indexOf('T') < 0) {
                LocalTime time = LocalTime.parse(value.length() == 5 ? value + ":00" : value);
                return LocalDateTime.of(LocalDate.now(VN), time);
            }
            return LocalDateTime.parse(value, DATE_TIME);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    public static LocalDateTime nowVn() {
        LocalDateTime req = REQUEST_OVERRIDE.get();
        if (req != null) {
            return req;
        }
        if (fixedOverride != null) {
            return fixedOverride;
        }
        return LocalDateTime.now(VN);
    }

    public static LocalDate todayVn() {
        return nowVn().toLocalDate();
    }

    /** Null → today VN. Rejects dates after today VN. */
    public static LocalDate resolveLogDate(LocalDate logDate) {
        LocalDate today = todayVn();
        LocalDate resolved = logDate != null ? logDate : today;
        if (resolved.isAfter(today)) {
            throw new BadRequestException("Không thể ghi nhật ký cho ngày trong tương lai");
        }
        return resolved;
    }

    /**
     * Plan dates may be today or future (self day-plan). Null → today VN.
     * Rejects dates before today (cannot plan the past).
     */
    public static LocalDate resolvePlanDate(LocalDate planDate) {
        LocalDate today = todayVn();
        LocalDate resolved = planDate != null ? planDate : today;
        if (resolved.isBefore(today)) {
            throw new BadRequestException("Không thể lên plan cho ngày trong quá khứ");
        }
        return resolved;
    }
}
