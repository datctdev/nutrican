package com.sba.nutricanbe.ai.catalog;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.io.InputStream;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;


@Slf4j
public final class ResNetClassManifest {

    private static final String MANIFEST_DIR = "/data/class_manifests/";
    private static volatile String activeProfile = "resnet_unified";
    private static volatile ManifestData loaded = ManifestData.emergencyEmpty();
    private static volatile boolean initialized;

    private ResNetClassManifest() {
    }

    private record ManifestData(
            String profile,
            String modelVersion,
            List<String> classOrder,
            Map<String, String> displayNames,
            Map<String, String> classAliases) {


        static ManifestData emergencyEmpty() {
            return new ManifestData(
                    "resnet_unified",
                    "resnet50-unified-vtn-food101",
                    List.of(),
                    Map.of(),
                    Map.of("spring_rolls", "goi_cuon"));
        }
    }


    public static void setActiveProfile(String profile) {
        if (profile == null || profile.isBlank()) {
            return;
        }
        synchronized (ResNetClassManifest.class) {
            activeProfile = profile.trim().toLowerCase();
            loaded = loadProfile(activeProfile);
            initialized = true;
        }
    }

    public static String activeProfile() {
        ensureLoaded();
        return loaded.profile();
    }

    public static String modelVersion() {
        ensureLoaded();
        return loaded.modelVersion();
    }

    public static List<String> classOrder() {
        ensureLoaded();
        return Collections.unmodifiableList(loaded.classOrder());
    }

    public static Map<String, String> allMappings() {
        ensureLoaded();
        Map<String, String> out = new LinkedHashMap<>();
        for (String code : loaded.classOrder()) {
            out.put(code, loaded.displayNames().getOrDefault(code, humanize(code)));
        }
        return Collections.unmodifiableMap(out);
    }

    public static Optional<String> displayNameVi(String foodCode) {
        if (foodCode == null || foodCode.isBlank()) {
            return Optional.empty();
        }
        ensureLoaded();
        String code = normalizeCode(foodCode);
        return Optional.ofNullable(loaded.displayNames().get(code));
    }

    public static String displayNameViOrDefault(String foodCode, String fallback) {
        return displayNameVi(foodCode).orElse(fallback != null ? fallback : humanize(foodCode));
    }

    public static boolean isKnownCode(String foodCode) {
        if (foodCode == null || foodCode.isBlank()) {
            return false;
        }
        ensureLoaded();
        return loaded.classOrder().contains(normalizeCode(foodCode));
    }

    public static String normalizeCode(String foodCode) {
        String code = foodCode.trim().toLowerCase();
        ensureLoaded();
        String alias = loaded.classAliases().get(code);
        return alias != null ? alias : code;
    }

    private static void ensureLoaded() {
        if (initialized) {
            return;
        }
        synchronized (ResNetClassManifest.class) {
            if (initialized) {
                return;
            }
            loaded = loadProfile(activeProfile);
            initialized = true;
        }
    }

    private static ManifestData loadProfile(String profile) {
        String resource = MANIFEST_DIR + profile + ".json";
        ObjectMapper mapper = new ObjectMapper();
        try (InputStream in = ResNetClassManifest.class.getResourceAsStream(resource)) {
            if (in == null) {
                log.error("ResNet manifest not found: {} — app will have 0 classes until JSON is on classpath", resource);
                return ManifestData.emergencyEmpty();
            }
            Map<String, Object> root = mapper.readValue(in, new TypeReference<>() {});
            @SuppressWarnings("unchecked")
            List<String> order = (List<String>) root.get("classOrder");
            @SuppressWarnings("unchecked")
            Map<String, String> names = (Map<String, String>) root.get("displayNames");
            @SuppressWarnings("unchecked")
            Map<String, String> aliases = (Map<String, String>) root.getOrDefault("classAliases", Map.of());
            String version = String.valueOf(root.getOrDefault("modelVersion", "resnet50-unknown"));
            log.info("ResNet class manifest loaded: profile={}, classes={}", profile, order != null ? order.size() : 0);
            return new ManifestData(
                    profile,
                    version,
                    order != null ? List.copyOf(order) : List.of(),
                    names != null ? Map.copyOf(names) : Map.of(),
                    aliases != null ? Map.copyOf(aliases) : Map.of());
        } catch (Exception e) {
            log.error("Failed to load ResNet manifest {}: {}", resource, e.getMessage());
            return ManifestData.emergencyEmpty();
        }
    }

    private static String humanize(String code) {
        if (code == null) {
            return "";
        }
        return code.replace('_', ' ');
    }
}
