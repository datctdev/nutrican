package com.sba.nutricanbe.diet.util;

import com.sba.nutricanbe.diet.enums.FoodCategoryGroup;

import java.util.Locale;
import java.util.Set;

/**
 * Single source of truth: seed/catalog {@code category} string → {@link FoodCategoryGroup}.
 */
public final class FoodCategoryGroups {

    private static final Set<String> PROTEIN = Set.of(
            "Thịt và sản phẩm chế biến",
            "Thủy sản và sản phẩm chế biến",
            "Trứng và sản phẩm chế biến",
            "Sữa và sản phẩm chế biến",
            "Hạt, quả giàu đạm, béo và sản phẩm chế biến"
    );

    private static final Set<String> CARB = Set.of(
            "Ngũ cốc và sản phẩm chế biến",
            "Khoai củ và sản phẩm chế biến"
    );

    private static final Set<String> FAT = Set.of("Dầu, mỡ, bơ");

    private static final Set<String> VEG = Set.of("Rau, quả, củ dùng làm rau");

    private static final Set<String> FRUIT = Set.of("Quả chín");

    private FoodCategoryGroups() {}

    public static FoodCategoryGroup resolve(String category) {
        if (category == null || category.isBlank()) {
            return FoodCategoryGroup.OTHER;
        }
        String c = category.trim();
        if (PROTEIN.contains(c)) return FoodCategoryGroup.PROTEIN;
        if (CARB.contains(c)) return FoodCategoryGroup.CARB;
        if (FAT.contains(c)) return FoodCategoryGroup.FAT;
        if (VEG.contains(c)) return FoodCategoryGroup.VEG;
        if (FRUIT.contains(c)) return FoodCategoryGroup.FRUIT;
        return FoodCategoryGroup.OTHER;
    }

    public static FoodCategoryGroup parseParam(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return FoodCategoryGroup.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
