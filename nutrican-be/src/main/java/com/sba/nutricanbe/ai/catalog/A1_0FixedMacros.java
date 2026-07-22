package com.sba.nutricanbe.ai.catalog;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sba.nutricanbe.common.dto.MacroNutrients;
import lombok.extern.slf4j.Slf4j;

import java.io.InputStream;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;


@Slf4j
public final class A1_0FixedMacros {

    private static final String RESOURCE = "/data/a1_0_fixed_macros.json";

    private static volatile boolean loaded;
    private static Map<String, MacroEntry> fixedServing = Map.of();
    private static MacroEntry fallbackUnknown = new MacroEntry(300, 15, 35, 10, 100);

    private A1_0FixedMacros() {
    }

    private record MacroEntry(int calories, int protein, int carb, int fat, int servingG) {
    }

    public static void ensureLoaded() {
        if (loaded) {
            return;
        }
        synchronized (A1_0FixedMacros.class) {
            if (loaded) {
                return;
            }
            load();
            loaded = true;
        }
    }

    private static void load() {
        ObjectMapper mapper = new ObjectMapper();
        try (InputStream stream = A1_0FixedMacros.class.getResourceAsStream(RESOURCE)) {
            if (stream == null) {
                log.warn("A1.0 fixed macros JSON not found — using hardcoded fallback");
                return;
            }
            Map<String, Object> root = mapper.readValue(stream, new TypeReference<>() {});
            Map<String, MacroEntry> out = new LinkedHashMap<>();
            Map<String, Object> raw = castMap(root.get("fixedServing"));
            for (Map.Entry<String, Object> e : raw.entrySet()) {
                if (e.getValue() instanceof Map<?, ?> map) {
                    out.put(e.getKey(), parseEntry(castMap(map)));
                }
            }
            fixedServing = Map.copyOf(out);
            Map<String, Object> fb = castMap(root.get("fallbackUnknown"));
            if (!fb.isEmpty()) {
                fallbackUnknown = parseEntry(fb);
            }
            log.info("A1.0 fixed macros loaded: {} food codes", fixedServing.size());
        } catch (Exception e) {
            log.error("Failed to load A1.0 fixed macros: {}", e.getMessage());
        }
    }


    public static MacroNutrients forCode(String foodCode) {
        ensureLoaded();
        if (foodCode == null || foodCode.isBlank()) {
            return toMacroNutrients(fallbackUnknown);
        }
        String code = foodCode.trim().toLowerCase();
        String resolved = ResNetClassManifest.normalizeCode(code);
        MacroEntry entry = fixedServing.get(resolved);
        if (entry == null) {
            entry = fallbackUnknown;
        }
        return toMacroNutrients(entry);
    }

    public static Optional<MacroEntry> entryForCode(String foodCode) {
        ensureLoaded();
        if (foodCode == null || foodCode.isBlank()) {
            return Optional.empty();
        }
        String code = foodCode.trim().toLowerCase();
        String resolved = ResNetClassManifest.normalizeCode(code);
        return Optional.ofNullable(fixedServing.get(resolved));
    }

    private static MacroEntry parseEntry(Map<String, Object> map) {
        return new MacroEntry(
                intVal(map.get("calories"), 300),
                intVal(map.get("protein"), 15),
                intVal(map.get("carb"), 35),
                intVal(map.get("fat"), 10),
                intVal(map.get("servingG"), 100));
    }

    private static MacroNutrients toMacroNutrients(MacroEntry e) {
        return MacroNutrients.of(
                BigDecimal.valueOf(e.calories()),
                BigDecimal.valueOf(e.protein()),
                BigDecimal.valueOf(e.carb()),
                BigDecimal.valueOf(e.fat()));
    }

    private static int intVal(Object o, int defaultVal) {
        if (o == null) {
            return defaultVal;
        }
        try {
            return (int) Math.round(Double.parseDouble(o.toString()));
        } catch (NumberFormatException e) {
            return defaultVal;
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> castMap(Object o) {
        return o instanceof Map<?, ?> m ? (Map<String, Object>) m : Map.of();
    }
}
