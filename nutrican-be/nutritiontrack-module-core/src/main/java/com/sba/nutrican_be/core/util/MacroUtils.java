package com.sba.nutrican_be.core.util;

import com.sba.nutrican_be.core.dto.MacroNutrients;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
public class MacroUtils {

    public static final BigDecimal ZERO = BigDecimal.ZERO;
    public static final BigDecimal DEFAULT_CALORIES = BigDecimal.valueOf(2000);
    public static final BigDecimal DEFAULT_PROTEIN = BigDecimal.valueOf(120);
    public static final BigDecimal DEFAULT_CARB = BigDecimal.valueOf(200);
    public static final BigDecimal DEFAULT_FAT = BigDecimal.valueOf(65);

    public static MacroNutrients newMacroMap() {
        return MacroNutrients.ZERO;
    }

    public static MacroNutrients buildAdjustedMacroMap(BigDecimal calories, BigDecimal protein,
                                                       BigDecimal carb, BigDecimal fat) {
        return MacroNutrients.of(calories, protein, carb, fat);
    }

    public static BigDecimal getMacro(MacroNutrients macros, String key) {
        if (macros == null) {
            return ZERO;
        }
        return switch (key) {
            case "calories" -> macros.calories();
            case "protein" -> macros.protein();
            case "carbs" -> macros.carbs();
            case "fat" -> macros.fat();
            default -> ZERO;
        };
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

    public static MacroNutrients copyMacroMap(MacroNutrients source) {
        return source;
    }

    public static MacroNutrients fromValues(BigDecimal calories, BigDecimal protein,
                                            BigDecimal carbs, BigDecimal fat) {
        return MacroNutrients.of(calories, protein, carbs, fat);
    }

    public static String fieldsChanged(MacroNutrients before, MacroNutrients after) {
        if (before == null || after == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        if (before.calories().compareTo(after.calories()) != 0) sb.append("calories");
        if (before.protein().compareTo(after.protein()) != 0) {
            if (!sb.isEmpty()) sb.append(",");
            sb.append("protein");
        }
        if (before.carbs().compareTo(after.carbs()) != 0) {
            if (!sb.isEmpty()) sb.append(",");
            sb.append("carbs");
        }
        if (before.fat().compareTo(after.fat()) != 0) {
            if (!sb.isEmpty()) sb.append(",");
            sb.append("fat");
        }
        return sb.toString();
    }
}
