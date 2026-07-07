package com.sba.nutricanbe.diet.util;

import com.sba.nutricanbe.diet.enums.DietTag;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class FoodDietTagHeuristics {

    private static final Set<String> MEAT = Set.of(
            "thit", "bo", "heo", "lon", "ga", "vit", "de", "cuu", "suon", "bacon", "ham",
            "beef", "pork", "chicken", "meat", "steak", "sausage");
    private static final Set<String> SEAFOOD = Set.of(
            "ca", "tom", "cua", "muc", "fish", "shrimp", "seafood", "salmon", "tuna");
    private static final Set<String> DAIRY = Set.of("sua", "cheese", "milk", "cream", "yogurt", "pho mai");
    private static final Set<String> KETO_HINT = Set.of("keto", "low carb", "low-carb", "butter", "avocado");
    private static final Set<String> CLEAN_HINT = Set.of("salad", "rau", "steamed", "grilled", "eat clean", "healthy");
    private static final Set<String> VEGAN_HINT = Set.of("vegan", "thuan chay", "dau hu", "tofu", "dau");
    private static final Set<String> VEGETARIAN_HINT = Set.of("chay", "vegetarian", "rau cu", "salad");

    private FoodDietTagHeuristics() {
    }

    public static List<String> inferTags(String nameVi, String nameEn, String category) {
        String blob = normalize(nameVi) + " " + normalize(nameEn) + " " + normalize(category);
        List<String> tags = new ArrayList<>();
        boolean hasAnimal = containsAny(blob, MEAT) || containsAny(blob, SEAFOOD) || containsAny(blob, DAIRY);

        if (containsAny(blob, VEGAN_HINT) && !hasAnimal) {
            tags.add(DietTag.VEGAN.name());
            tags.add(DietTag.VEGETARIAN.name());
        } else if (containsAny(blob, VEGETARIAN_HINT) && !hasAnimal) {
            tags.add(DietTag.VEGETARIAN.name());
        } else if (!hasAnimal && containsAny(blob, Set.of("com", "pho", "bun", "mi", "chao", "xoi"))) {
            tags.add(DietTag.VEGETARIAN.name());
        }

        if (containsAny(blob, KETO_HINT)) {
            tags.add(DietTag.KETO.name());
        }
        if (containsAny(blob, CLEAN_HINT) && !hasAnimal) {
            tags.add(DietTag.EAT_CLEAN.name());
        }
        if (tags.isEmpty() && !hasAnimal) {
            tags.add(DietTag.EAT_CLEAN.name());
        }
        return tags.stream().distinct().toList();
    }

    private static boolean containsAny(String text, Set<String> keywords) {
        for (String k : keywords) {
            if (text.contains(k)) {
                return true;
            }
        }
        return false;
    }

    private static String normalize(String text) {
        if (text == null) {
            return "";
        }
        return text.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
