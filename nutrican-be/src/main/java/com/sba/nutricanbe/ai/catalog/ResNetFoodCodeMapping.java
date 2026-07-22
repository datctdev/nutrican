package com.sba.nutricanbe.ai.catalog;

import java.util.List;
import java.util.Map;
import java.util.Optional;


public final class ResNetFoodCodeMapping {

    private ResNetFoodCodeMapping() {
    }

    public static String modelVersion() {
        return ResNetClassManifest.modelVersion();
    }

    public static Optional<String> catalogNameVi(String foodCode) {
        if (foodCode == null || foodCode.isBlank()) {
            return Optional.empty();
        }
        return ResNetClassManifest.displayNameVi(ResNetClassManifest.normalizeCode(foodCode));
    }

    public static String catalogNameViOrDisplay(String foodCode, String displayName) {
        return ResNetClassManifest.displayNameViOrDefault(
                ResNetClassManifest.normalizeCode(foodCode), displayName);
    }

    public static List<String> classOrder() {
        return ResNetClassManifest.classOrder();
    }

    public static Map<String, String> allMappings() {
        return ResNetClassManifest.allMappings();
    }

    public static boolean isKnownCode(String foodCode) {
        return ResNetClassManifest.isKnownCode(foodCode);
    }
}
