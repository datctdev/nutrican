package com.sba.nutricanbe.ai.catalog;

import java.util.Locale;
import java.util.Set;

/**
 * Cuisine / catalog grouping for fusion guardrails (VN vs Food-101 vs unified VN dishes).
 */
public final class FoodCodeCategory {

    private static final Set<String> RESNET10_CODES = Set.of(
            "banh_chung", "banh_khot", "banh_mi", "banh_trang_nuong", "banh_xeo",
            "bun_dau_mam_tom", "ca_kho_to", "com_tam", "goi_cuon", "pho");

    private FoodCodeCategory() {
    }

    public static String normalize(String foodCode) {
        if (foodCode == null || foodCode.isBlank()) {
            return "";
        }
        return ResNetClassManifest.normalizeCode(foodCode.trim().toLowerCase(Locale.ROOT));
    }

    public static boolean isFood101(String foodCode) {
        String code = normalize(foodCode);
        if (code.isEmpty()) {
            return false;
        }
        if (RESNET10_CODES.contains(code)) {
            return false;
        }
        NutriHomeCatalog.ensureLoaded();
        return NutriHomeCatalog.isFood101Code(code);
    }

    public static boolean isVietnameseResNet10(String foodCode) {
        return RESNET10_CODES.contains(normalize(foodCode));
    }

    public static boolean isVietnamese(String foodCode) {
        String code = normalize(foodCode);
        if (code.isEmpty()) {
            return false;
        }
        if (RESNET10_CODES.contains(code)) {
            return true;
        }
        if (isFood101(code)) {
            return false;
        }
        NutriHomeCatalog.ensureLoaded();
        return NutriHomeCatalog.isUnifiedVnCode(code);
    }

    /** True when LLaVA mapped a VN dish name/code but ResNet hint is international Food-101. */
    public static boolean isCrossCuisineHallucination(String resnetCode, String llavaResolvedCode) {
        if (resnetCode == null || llavaResolvedCode == null) {
            return false;
        }
        return isFood101(resnetCode) && isVietnamese(llavaResolvedCode);
    }
}
