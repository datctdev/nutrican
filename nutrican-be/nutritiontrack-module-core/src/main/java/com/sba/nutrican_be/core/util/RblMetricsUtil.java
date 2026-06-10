package com.sba.nutrican_be.core.util;

import com.sba.nutrican_be.core.entity.DietLog;
import com.sba.nutrican_be.core.enums.MealSource;
import com.sba.nutrican_be.core.enums.PtReviewAction;
import com.sba.nutrican_be.core.enums.RecognitionSource;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class RblMetricsUtil {

    private RblMetricsUtil() {}

    public static BigDecimal mae(List<DietLog> logs, String aiKey, String ptKey) {
        if (logs.isEmpty()) return BigDecimal.ZERO;
        BigDecimal sum = BigDecimal.ZERO;
        int count = 0;
        for (DietLog log : logs) {
            Map<String, Object> ai = aiKey.equals("ai") ? log.getAiPredictedMacros() : log.getDbMatchedMacros();
            Map<String, Object> pt = log.getPtAdjustedMacros();
            if (ai == null || pt == null) continue;
            BigDecimal diff = MacroUtils.toBd(ai.get("calories")).subtract(MacroUtils.toBd(pt.get("calories"))).abs();
            sum = sum.add(diff);
            count++;
        }
        if (count == 0) return BigDecimal.ZERO;
        return sum.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
    }

    public static double adjustRate(List<DietLog> logs) {
        if (logs.isEmpty()) return 0;
        long adjusts = logs.stream().filter(l -> l.getPtAction() == PtReviewAction.ADJUST).count();
        return (double) adjusts / logs.size();
    }

    public static double adjustRateByMealSource(List<DietLog> logs, MealSource source) {
        List<DietLog> filtered = logs.stream().filter(l -> l.getMealSource() == source).toList();
        return adjustRate(filtered);
    }

    public static String customerHash(UUID customerId) {
        if (customerId == null) return "";
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(customerId.toString().getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 8 && i < hash.length; i++) {
                sb.append(String.format("%02x", hash[i]));
            }
            return sb.toString();
        } catch (Exception e) {
            return customerId.toString().substring(0, 8);
        }
    }

    public static BigDecimal delta(Map<String, Object> a, Map<String, Object> b, String key) {
        if (a == null || b == null) return null;
        return MacroUtils.toBd(a.get(key)).subtract(MacroUtils.toBd(b.get(key))).abs();
    }

    public static boolean isCvLog(DietLog log) {
        return log.getRecognitionSource() != null && log.getRecognitionSource() != RecognitionSource.MANUAL;
    }
}
