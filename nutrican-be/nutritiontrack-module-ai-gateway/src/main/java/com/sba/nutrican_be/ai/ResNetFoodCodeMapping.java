package com.sba.nutrican_be.ai;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Maps ResNet50 food_code (10 classes) to Vietnamese catalog names for Food DB hybrid (A1.1).
 */
public final class ResNetFoodCodeMapping {

    public static final String MODEL_VERSION = "resnet50-vtn-10class";

    private static final Map<String, String> CODE_TO_NAME_VI = Map.ofEntries(
            Map.entry("banh_chung", "Bánh Chưng"),
            Map.entry("banh_khot", "Bánh Khọt"),
            Map.entry("banh_mi", "Bánh Mì"),
            Map.entry("banh_trang_nuong", "Bánh Tráng Nướng"),
            Map.entry("banh_xeo", "Bánh Xèo"),
            Map.entry("bun_dau_mam_tom", "Bún Đậu Mắm Tôm"),
            Map.entry("ca_kho_to", "Cá Kho Tộ"),
            Map.entry("com_tam", "Cơm Tấm (Cơm sườn)"),
            Map.entry("goi_cuon", "Gỏi Cuốn"),
            Map.entry("pho", "Phở")
    );

    private static final List<String> CLASS_ORDER = List.of(
            "banh_chung", "banh_khot", "banh_mi", "banh_trang_nuong", "banh_xeo",
            "bun_dau_mam_tom", "ca_kho_to", "com_tam", "goi_cuon", "pho"
    );

    private ResNetFoodCodeMapping() {
    }

    public static Optional<String> catalogNameVi(String foodCode) {
        if (foodCode == null || foodCode.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(CODE_TO_NAME_VI.get(foodCode.trim().toLowerCase()));
    }

    public static String catalogNameViOrDisplay(String foodCode, String displayName) {
        return catalogNameVi(foodCode).orElse(displayName);
    }

    public static List<String> classOrder() {
        return CLASS_ORDER;
    }

    public static Map<String, String> allMappings() {
        return Collections.unmodifiableMap(new LinkedHashMap<>(CODE_TO_NAME_VI));
    }
}
