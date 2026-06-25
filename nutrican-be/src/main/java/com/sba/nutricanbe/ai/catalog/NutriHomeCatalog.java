package com.sba.nutricanbe.ai.catalog;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Loads NutriHome PDF macro data extracted to JSON (333 foods + ResNet10 bundle).
 * Regenerate: {@code research/scripts/extract_nutrihome_pdf.py}
 */
@Slf4j
public final class NutriHomeCatalog {

    private static final String RESNET10_RESOURCE = "/data/nutrihome_resnet10.json";
    private static final String FULL_CATALOG_RESOURCE = "/data/nutrihome_foods.json";

    private static volatile boolean loaded;
    private static Map<String, MacroServing> resnet10 = Map.of();
    private static Map<String, MacroServing> variants = Map.of();
    private static Map<String, String> variantAliases = Map.of();
    private static List<FoodRow> allFoods = List.of();
    private static String extractedAt = "";

    private NutriHomeCatalog() {
    }

    public record MacroServing(
            String foodCode,
            String nameVi,
            String unit,
            int servingG,
            BigDecimal calories,
            BigDecimal protein,
            BigDecimal fat,
            BigDecimal carb,
            String category,
            Integer nutrihomeStt) {
    }

    public record FoodRow(
            int stt,
            String nameVi,
            String unit,
            BigDecimal calories,
            BigDecimal protein,
            BigDecimal fat,
            BigDecimal carb,
            String category,
            Integer servingG) {
    }

    public static void ensureLoaded() {
        if (loaded) {
            return;
        }
        synchronized (NutriHomeCatalog.class) {
            if (loaded) {
                return;
            }
            load();
            loaded = true;
        }
    }

    private static void load() {
        ObjectMapper mapper = new ObjectMapper();
        try (InputStream resnetStream = NutriHomeCatalog.class.getResourceAsStream(RESNET10_RESOURCE)) {
            if (resnetStream == null) {
                log.warn("NutriHome resnet10 JSON not found — using ResNetFoodDefaults fallback");
                return;
            }
            Map<String, Object> bundle = mapper.readValue(resnetStream, new TypeReference<>() {});
            extractedAt = stringVal(bundle.get("extractedAt"));
            resnet10 = parseMacroMap(castMap(bundle.get("resnet10")));
            var variantRaw = castMap(bundle.get("variants"));
            variants = parseVariantMap(variantRaw);
            variantAliases = parseVariantAliases(variantRaw);
            log.info("NutriHome catalog loaded: {} ResNet10 dishes, extractedAt={}",
                    resnet10.size(), extractedAt);
        } catch (Exception e) {
            log.error("Failed to load NutriHome catalog: {}", e.getMessage());
        }
        try (InputStream fullStream = NutriHomeCatalog.class.getResourceAsStream(FULL_CATALOG_RESOURCE)) {
            if (fullStream != null) {
                Map<String, Object> full = mapper.readValue(fullStream, new TypeReference<>() {});
                allFoods = parseAllFoods(castList(full.get("all_foods")));
                log.info("NutriHome full catalog: {} foods", allFoods.size());
            }
        } catch (Exception e) {
            log.warn("Full NutriHome catalog not loaded: {}", e.getMessage());
        }
    }

    public static Optional<MacroServing> forCode(String foodCode) {
        ensureLoaded();
        if (foodCode == null || foodCode.isBlank()) {
            return Optional.empty();
        }
        String code = foodCode.trim().toLowerCase();
        MacroServing direct = resnet10.get(code);
        if (direct != null) {
            return Optional.of(direct);
        }
        String alias = variantAliases.get(code);
        if (alias != null) {
            return forCode(alias);
        }
        MacroServing variant = variants.get(code);
        if (variant != null) {
            return Optional.of(variant);
        }
        return Optional.empty();
    }

    public static BigDecimal defaultServingG(String foodCode) {
        return forCode(foodCode)
                .map(m -> BigDecimal.valueOf(m.servingG()))
                .orElse(BigDecimal.valueOf(100));
    }

    public static Map<String, BigDecimal> scaledMacros(String foodCode, BigDecimal portionRatio) {
        Optional<MacroServing> opt = forCode(foodCode);
        if (opt.isEmpty()) {
            return Map.of();
        }
        MacroServing m = opt.get();
        BigDecimal ratio = portionRatio != null && portionRatio.compareTo(BigDecimal.ZERO) > 0
                ? portionRatio : BigDecimal.ONE;
        Map<String, BigDecimal> macros = new LinkedHashMap<>();
        macros.put("calories", scale(m.calories(), ratio));
        macros.put("protein", scale(m.protein(), ratio));
        macros.put("carbs", scale(m.carb(), ratio));
        macros.put("fat", scale(m.fat(), ratio));
        macros.put("servingG", scale(BigDecimal.valueOf(m.servingG()), ratio));
        return macros;
    }

    public static Map<String, MacroServing> allResnet10() {
        ensureLoaded();
        return Collections.unmodifiableMap(resnet10);
    }

    public static List<FoodRow> searchByName(String query, int limit) {
        ensureLoaded();
        if (query == null || query.isBlank() || allFoods.isEmpty()) {
            return List.of();
        }
        String q = normalize(query);
        return allFoods.stream()
                .filter(f -> normalize(f.nameVi()).contains(q))
                .limit(limit)
                .toList();
    }

    /** Compact NutriHome table for LLaVA prompt (ResNet10 + key variants). */
    public static String llavaMacroReferenceBlock() {
        ensureLoaded();
        StringBuilder sb = new StringBuilder();
        for (MacroServing m : resnet10.values()) {
            sb.append(formatMacroLine(m)).append("\n");
        }
        for (Map.Entry<String, MacroServing> e : variants.entrySet()) {
            if (!e.getKey().contains("alias")) {
                sb.append(formatMacroLine(e.getValue())).append("\n");
            }
        }
        return sb.toString().trim();
    }

    private static String formatMacroLine(MacroServing m) {
        return String.format("- %s [%s]: %dg (%s) → %.0f kcal, P%.0fg F%.0fg C%.0fg",
                m.nameVi(), m.foodCode(), m.servingG(), m.unit(),
                m.calories().doubleValue(), m.protein().doubleValue(),
                m.fat().doubleValue(), m.carb().doubleValue());
    }

    private static Map<String, MacroServing> parseMacroMap(Map<String, Object> raw) {
        if (raw == null) {
            return Map.of();
        }
        Map<String, MacroServing> out = new LinkedHashMap<>();
        for (Map.Entry<String, Object> e : raw.entrySet()) {
            if (e.getValue() instanceof Map<?, ?> map) {
                out.put(e.getKey(), parseMacroEntry(e.getKey(), castMap(map)));
            }
        }
        return out;
    }

    private static Map<String, MacroServing> parseVariantMap(Map<String, Object> raw) {
        if (raw == null) {
            return Map.of();
        }
        Map<String, MacroServing> out = new LinkedHashMap<>();
        for (Map.Entry<String, Object> e : raw.entrySet()) {
            if (e.getValue() instanceof Map<?, ?> map) {
                if (map.containsKey("aliasOf")) {
                    continue;
                }
                out.put(e.getKey(), parseMacroEntry(e.getKey(), castMap(map)));
            }
        }
        return out;
    }

    private static Map<String, String> parseVariantAliases(Map<String, Object> raw) {
        if (raw == null) {
            return Map.of();
        }
        Map<String, String> out = new LinkedHashMap<>();
        for (Map.Entry<String, Object> e : raw.entrySet()) {
            if (e.getValue() instanceof Map<?, ?> map && map.containsKey("aliasOf")) {
                Object alias = map.get("aliasOf");
                if (alias != null) {
                    out.put(e.getKey(), alias.toString());
                }
            }
        }
        return out;
    }

    private static MacroServing parseMacroEntry(String code, Map<String, Object> map) {
        int servingG = intVal(map.get("servingG"), 100);
        return new MacroServing(
                stringVal(map.getOrDefault("foodCode", code)),
                stringVal(map.get("nameVi")),
                stringVal(map.get("unit")),
                servingG,
                toBd(map.get("calories")),
                toBd(map.get("protein")),
                toBd(map.get("fat")),
                toBd(map.get("carb")),
                stringVal(map.get("category")),
                intVal(map.get("nutrihomeStt"), null));
    }

    private static List<FoodRow> parseAllFoods(List<Map<String, Object>> raw) {
        if (raw == null) {
            return List.of();
        }
        return raw.stream().map(m -> new FoodRow(
                intVal(m.get("stt"), 0),
                stringVal(m.get("nameVi")),
                stringVal(m.get("unit")),
                toBd(m.get("calories")),
                toBd(m.get("protein")),
                toBd(m.get("fat")),
                toBd(m.get("carb")),
                stringVal(m.get("category")),
                intVal(m.get("servingG"), null)
        )).toList();
    }

    private static BigDecimal scale(BigDecimal value, BigDecimal ratio) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        return value.multiply(ratio).setScale(2, RoundingMode.HALF_UP);
    }

    private static String normalize(String s) {
        return s.toLowerCase().replaceAll("\\p{M}", "");
    }

    private static String stringVal(Object o) {
        return o == null ? "" : o.toString();
    }

    private static BigDecimal toBd(Object o) {
        if (o == null) {
            return BigDecimal.ZERO;
        }
        try {
            return new BigDecimal(o.toString());
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    private static int intVal(Object o, Integer defaultVal) {
        if (o == null) {
            return defaultVal != null ? defaultVal : 0;
        }
        try {
            return (int) Math.round(Double.parseDouble(o.toString()));
        } catch (NumberFormatException e) {
            return defaultVal != null ? defaultVal : 0;
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> castMap(Object o) {
        return o instanceof Map<?, ?> m ? (Map<String, Object>) m : Map.of();
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> castList(Object o) {
        return o instanceof List<?> l ? (List<Map<String, Object>>) l : List.of();
    }
}

