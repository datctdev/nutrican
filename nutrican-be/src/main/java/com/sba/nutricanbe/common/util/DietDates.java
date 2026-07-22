package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.common.exception.BadRequestException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;


public final class DietDates {

    public static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    public static final String DEMO_CLOCK_HEADER = "X-Nutrican-Demo-Vn-Clock";

    private static final ThreadLocal<LocalDateTime> REQUEST_OVERRIDE = new ThreadLocal<>();
    private static volatile LocalDateTime fixedOverride;
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm[:ss]");

    private DietDates() {}


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


    public static LocalDate resolveLogDate(LocalDate logDate) {
        LocalDate today = todayVn();
        LocalDate resolved = logDate != null ? logDate : today;
        if (resolved.isAfter(today)) {
            throw new BadRequestException("Không thể ghi nhật ký cho ngày trong tương lai");
        }
        return resolved;
    }


    public static LocalDate resolvePlanDate(LocalDate planDate) {
        LocalDate today = todayVn();
        LocalDate resolved = planDate != null ? planDate : today;
        if (resolved.isBefore(today)) {
            throw new BadRequestException("Không thể lên plan cho ngày trong quá khứ");
        }
        return resolved;
    }
}
