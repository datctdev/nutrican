package com.sba.nutricanbe.common.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;

public record MacroNutrients(
        BigDecimal calories,
        BigDecimal protein,
        BigDecimal carbs,
        BigDecimal fat
) {
    public static final MacroNutrients ZERO = new MacroNutrients(
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO
    );

    public MacroNutrients {
        calories = normalize(calories);
        protein = normalize(protein);
        carbs = normalize(carbs);
        fat = normalize(fat);
    }

    private static BigDecimal normalize(BigDecimal value) {
        if (value == null) return BigDecimal.ZERO;
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    public static MacroNutrients of(BigDecimal calories, BigDecimal protein, BigDecimal carbs, BigDecimal fat) {
        return new MacroNutrients(calories, protein, carbs, fat);
    }

    public MacroNutrients add(MacroNutrients other) {
        if (other == null) return this;
        return new MacroNutrients(
                this.calories.add(other.calories()),
                this.protein.add(other.protein()),
                this.carbs.add(other.carbs()),
                this.fat.add(other.fat())
        );
    }

    public MacroNutrients subtract(MacroNutrients other) {
        if (other == null) return this;
        return new MacroNutrients(
                this.calories.subtract(other.calories()),
                this.protein.subtract(other.protein()),
                this.carbs.subtract(other.carbs()),
                this.fat.subtract(other.fat())
        );
    }

    public MacroNutrients scale(BigDecimal ratio) {
        if (ratio == null || ratio.compareTo(BigDecimal.ZERO) < 0) return ZERO;
        return new MacroNutrients(
                this.calories.multiply(ratio),
                this.protein.multiply(ratio),
                this.carbs.multiply(ratio),
                this.fat.multiply(ratio)
        );
    }
}
