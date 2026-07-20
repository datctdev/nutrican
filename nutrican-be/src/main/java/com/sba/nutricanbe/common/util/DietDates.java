package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.common.exception.BadRequestException;

import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Business "today" for diet logs — Vietnam wall clock, not JVM default.
 */
public final class DietDates {

    public static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    private DietDates() {}

    public static LocalDate todayVn() {
        return LocalDate.now(VN);
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
