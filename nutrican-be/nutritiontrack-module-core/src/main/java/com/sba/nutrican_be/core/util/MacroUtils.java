package com.sba.nutrican_be.core.util;

import com.sba.nutrican_be.core.entity.DietLog;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class MacroUtils {

    public static final BigDecimal ZERO = BigDecimal.ZERO;
    public static final BigDecimal DEFAULT_CALORIES = BigDecimal.valueOf(2000);
    public static final BigDecimal DEFAULT_PROTEIN = BigDecimal.valueOf(120);
    public static final BigDecimal DEFAULT_CARB = BigDecimal.valueOf(200);
    public static final BigDecimal DEFAULT_FAT = BigDecimal.valueOf(65);

    public static Map<String, Object> newMacroMap() {
        Map<String, Object> macros = new HashMap<>();
        macros.put("calories", ZERO);
        macros.put("protein", ZERO);
        macros.put("carbs", ZERO);
        macros.put("fat", ZERO);
        return macros;
    }

    public static Map<String, Object> buildAdjustedMacroMap(BigDecimal calories, BigDecimal protein,
                                                           BigDecimal carb, BigDecimal fat) {
        Map<String, Object> macros = new HashMap<>();
        macros.put("calories", calories != null ? calories : ZERO);
        macros.put("protein", protein != null ? protein : ZERO);
        macros.put("carbs", carb != null ? carb : ZERO);
        macros.put("fat", fat != null ? fat : ZERO);
        macros.put("adjusted", true);
        return macros;
    }

    public static BigDecimal getMacro(DietLog dietLog, String key) {
        if (dietLog.getMacrosJson() == null || !dietLog.getMacrosJson().containsKey(key)) {
            return ZERO;
        }
        Object val = dietLog.getMacrosJson().get(key);
        return toBd(val);
    }

    public static BigDecimal toBd(Object val) {
        if (val == null) return ZERO;
        if (val instanceof BigDecimal) return (BigDecimal) val;
        try {
            return new BigDecimal(val.toString());
        } catch (Exception e) {
            return ZERO;
        }
    }

    public static BigDecimal add(BigDecimal a, BigDecimal b) {
        if (a == null) a = ZERO;
        if (b == null) b = ZERO;
        return a.add(b);
    }

    public static BigDecimal defaultIfNull(BigDecimal value, BigDecimal defaultValue) {
        return value != null ? value : defaultValue;
    }

    public static Map<String, Object> copyMacroMap(Map<String, Object> source) {
        if (source == null) {
            return null;
        }
        return new HashMap<>(source);
    }

    public static Map<String, Object> fromValues(BigDecimal calories, BigDecimal protein,
                                                 BigDecimal carbs, BigDecimal fat) {
        Map<String, Object> macros = newMacroMap();
        macros.put("calories", calories != null ? calories : ZERO);
        macros.put("protein", protein != null ? protein : ZERO);
        macros.put("carbs", carbs != null ? carbs : ZERO);
        macros.put("fat", fat != null ? fat : ZERO);
        return macros;
    }

    public static String fieldsChanged(Map<String, Object> before, Map<String, Object> after) {
        if (before == null || after == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (String key : List.of("calories", "protein", "carbs", "fat")) {
            BigDecimal b = toBd(before.get(key));
            BigDecimal a = toBd(after.get(key));
            if (b.compareTo(a) != 0) {
                if (!sb.isEmpty()) sb.append(",");
                sb.append(key);
            }
        }
        return sb.toString();
    }
}
