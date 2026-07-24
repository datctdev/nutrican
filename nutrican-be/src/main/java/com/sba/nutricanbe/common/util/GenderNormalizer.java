package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.common.exception.BadRequestException;

/**
 * Canonical HV {@code User.gender}: lowercase {@code male} | {@code female}.
 * Accepts legacy {@code MALE}/{@code FEMALE} and common aliases.
 */
public final class GenderNormalizer {

    private GenderNormalizer() {
    }

    /** Soft normalize for reads — never throws; returns null if blank/unknown. */
    public static String normalize(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String g = raw.trim().toLowerCase();
        if ("male".equals(g) || "m".equals(g)) {
            return "male";
        }
        if ("female".equals(g) || "f".equals(g)) {
            return "female";
        }
        return null;
    }

    /** Strict normalize for writes — rejects unknown values. */
    public static String requireCanonical(String raw) {
        String n = normalize(raw);
        if (n == null) {
            throw new BadRequestException("Giới tính chỉ nhận Nam (male) hoặc Nữ (female)");
        }
        return n;
    }
}
