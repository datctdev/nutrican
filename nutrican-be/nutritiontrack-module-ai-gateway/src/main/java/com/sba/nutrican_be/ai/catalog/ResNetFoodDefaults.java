package com.sba.nutrican_be.ai.catalog;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

/**
 * ResNet50 10-class macro defaults — delegates to {@link NutriHomeCatalog} (NutriHome PDF JSON).
 * Fallback hardcoded values if JSON not on classpath.
 */
public final class ResNetFoodDefaults {

    public static final String SOURCE = "NUTRIHOME_PDF";

    public record MacroServing(int calories, int protein, int carb, int fat, int servingG, String unit) {}

    private static final Map<String, MacroServing> FALLBACK = Map.ofEntries(
            Map.entry("banh_chung", new MacroServing(408, 15, 75, 6, 200, "1 cái")),
            Map.entry("banh_khot", new MacroServing(154, 6, 17, 7, 150, "1 đĩa 5 cái")),
            Map.entry("banh_mi", new MacroServing(240, 8, 51, 1, 250, "1 ổ trung")),
            Map.entry("banh_trang_nuong", new MacroServing(300, 5, 33, 16, 200, "100g đĩa")),
            Map.entry("banh_xeo", new MacroServing(517, 15, 71, 19, 180, "1 cái")),
            Map.entry("bun_dau_mam_tom", new MacroServing(760, 58, 49, 45, 400, "1 suất")),
            Map.entry("ca_kho_to", new MacroServing(330, 39, 22, 10, 350, "1 tộ")),
            Map.entry("com_tam", new MacroServing(529, 21, 82, 13, 350, "1 phần cơm tấm sườn")),
            Map.entry("goi_cuon", new MacroServing(116, 10, 11, 4, 120, "3 cuốn")),
            Map.entry("pho", new MacroServing(414, 18, 59, 12, 500, "1 tô"))
    );

    private static final Map<String, String> ALIASES = Map.ofEntries(
            Map.entry("banh_chung", "banh_chung,banh chung"),
            Map.entry("banh_khot", "banh_khot,banh khot"),
            Map.entry("banh_mi", "banh_mi,banh mi"),
            Map.entry("banh_trang_nuong", "banh_trang_nuong,banh trang nuong,banh trang tron"),
            Map.entry("banh_xeo", "banh_xeo,banh xeo"),
            Map.entry("bun_dau_mam_tom", "bun_dau_mam_tom,bun dau mam tom"),
            Map.entry("ca_kho_to", "ca_kho_to,ca kho to,ca loc kho"),
            Map.entry("com_tam", "com_tam,com tam,com suon,com tam suon,com suon nuong"),
            Map.entry("goi_cuon", "goi_cuon,goi cuon,goi bi cuon"),
            Map.entry("pho", "pho,pho bo,pho ga,phở")
    );

    private ResNetFoodDefaults() {
    }

    public static Optional<MacroServing> forCode(String foodCode) {
        if (foodCode == null || foodCode.isBlank()) {
            return Optional.empty();
        }
        String code = foodCode.trim().toLowerCase();
        Optional<NutriHomeCatalog.MacroServing> fromCatalog = NutriHomeCatalog.forCode(code);
        if (fromCatalog.isPresent()) {
            NutriHomeCatalog.MacroServing m = fromCatalog.get();
            return Optional.of(new MacroServing(
                    m.calories().intValue(),
                    m.protein().intValue(),
                    m.carb().intValue(),
                    m.fat().intValue(),
                    m.servingG(),
                    m.unit()));
        }
        return Optional.ofNullable(FALLBACK.get(code));
    }

    public static BigDecimal defaultServingG(String foodCode) {
        return NutriHomeCatalog.defaultServingG(foodCode);
    }

    public static Map<String, BigDecimal> scaledMacros(String foodCode, BigDecimal portionRatio) {
        Map<String, BigDecimal> fromCatalog = NutriHomeCatalog.scaledMacros(foodCode, portionRatio);
        if (!fromCatalog.isEmpty()) {
            return fromCatalog;
        }
        MacroServing m = forCode(foodCode).orElse(null);
        if (m == null) {
            return Map.of();
        }
        BigDecimal ratio = portionRatio != null && portionRatio.compareTo(BigDecimal.ZERO) > 0
                ? portionRatio : BigDecimal.ONE;
        return Map.of(
                "calories", BigDecimal.valueOf(m.calories()).multiply(ratio),
                "protein", BigDecimal.valueOf(m.protein()).multiply(ratio),
                "carbs", BigDecimal.valueOf(m.carb()).multiply(ratio),
                "fat", BigDecimal.valueOf(m.fat()).multiply(ratio),
                "servingG", BigDecimal.valueOf(m.servingG()).multiply(ratio));
    }

    public static String aliasesCsv(String foodCode) {
        return ALIASES.getOrDefault(foodCode, foodCode);
    }
}

