package com.sba.nutrican_be.ai.util;

import com.sba.nutrican_be.ai.dto.LlavaMealAnalysisResult;
import com.sba.nutrican_be.ai.catalog.ResNetFoodDefaults;
import com.sba.nutrican_be.ai.catalog.ResNetFoodCodeMapping;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Fuses ResNet50 + LLaVA + NutriHome (PDF) into final food code, grams, and macros.
 */
public final class MealAnalysisFusion {

    public static final String SOURCE_HYBRID_LLAVA = "HYBRID_LLAVA_NUTRIHOME";
    public static final String SOURCE_RESNET_NUTRIHOME = "RESNET_NUTRIHOME";
    public static final String SOURCE_LLAVA_ONLY = "LLAVA_NUTRIHOME";

    private static final BigDecimal LLAVA_OVERRIDE_THRESHOLD = BigDecimal.valueOf(0.55);
    private static final BigDecimal RESNET_LOW_THRESHOLD = BigDecimal.valueOf(0.35);
    /** Known ResNet confusion pairs — LLaVA can override at lower confidence */
    private static final BigDecimal CONFUSION_PAIR_THRESHOLD = BigDecimal.valueOf(0.42);

    private MealAnalysisFusion() {
    }

    @Data
    @Builder
    public static class FusedMealAnalysis {
        private String foodCode;
        private String foodNameVi;
        private BigDecimal portionRatio;
        private BigDecimal estimatedTotalGrams;
        private BigDecimal calories;
        private BigDecimal protein;
        private BigDecimal carbs;
        private BigDecimal fat;
        private BigDecimal confidenceScore;
        private boolean needsConfirmation;
        private boolean llavaUsed;
        private String macroSource;
        private String fusionNote;
        private LlavaMealAnalysisResult llavaResult;
    }

    public static FusedMealAnalysis fuse(
            String resnetFoodCode,
            String resnetFoodName,
            BigDecimal resnetConfidence,
            BigDecimal resnetPortionRatio,
            boolean resnetNeedsConfirmation,
            LlavaMealAnalysisResult llava) {

        String chosenCode = resnetFoodCode;
        String chosenName = resnetFoodName;
        BigDecimal confidence = resnetConfidence != null ? resnetConfidence : BigDecimal.ZERO;
        boolean llavaUsed = false;
        String macroSource = SOURCE_RESNET_NUTRIHOME;
        String fusionNote = "ResNet + NutriHome PDF";

        if (llava != null && llava.isSuccess()) {
            llavaUsed = true;
            String llavaCode = resolveFoodCode(llava.getMessage(), llava.getFoodNameVi());
            BigDecimal llavaConf = llava.getConfidence() != null ? llava.getConfidence() : BigDecimal.ZERO;
            boolean resnetLow = confidence.compareTo(RESNET_LOW_THRESHOLD) < 0;
            boolean llavaConfident = llavaConf.compareTo(LLAVA_OVERRIDE_THRESHOLD) >= 0;
            boolean confusionOverride = isConfusionPairOverride(resnetFoodCode, llavaCode)
                    && llavaConf.compareTo(CONFUSION_PAIR_THRESHOLD) >= 0;

            if (llavaCode != null && (llavaConfident || resnetLow || confusionOverride
                    || !llavaCode.equals(resnetFoodCode))) {
                if (llavaConfident || resnetLow || confusionOverride
                        || llavaConf.compareTo(confidence) > 0) {
                    chosenCode = llavaCode;
                    chosenName = ResNetFoodCodeMapping.catalogNameViOrDisplay(
                            llavaCode, llava.getFoodNameVi() != null ? llava.getFoodNameVi() : resnetFoodName);
                    confidence = llavaConf.max(confidence);
                    macroSource = resnetLow || confusionOverride || !llavaCode.equals(resnetFoodCode)
                            ? SOURCE_HYBRID_LLAVA : SOURCE_RESNET_NUTRIHOME;
                    fusionNote = confusionOverride
                            ? "LLaVA fixed ResNet confusion (" + resnetFoodCode + "→" + llavaCode + ")"
                            : "LLaVA corrected ResNet → " + chosenName;
                }
            }
        }

        BigDecimal servingG = ResNetFoodDefaults.defaultServingG(chosenCode);
        BigDecimal estimatedGrams = null;
        if (llavaUsed && llava.getEstimatedTotalGrams() != null
                && llava.getEstimatedTotalGrams().compareTo(BigDecimal.ZERO) > 0) {
            estimatedGrams = llava.getEstimatedTotalGrams();
        } else if (servingG != null && resnetPortionRatio != null) {
            estimatedGrams = servingG.multiply(resnetPortionRatio).setScale(0, RoundingMode.HALF_UP);
        }

        BigDecimal portionRatio = resnetPortionRatio != null ? resnetPortionRatio : BigDecimal.ONE;
        if (estimatedGrams != null && servingG.compareTo(BigDecimal.ZERO) > 0) {
            portionRatio = estimatedGrams.divide(servingG, 3, RoundingMode.HALF_UP);
        }
        portionRatio = clampPortionRatio(portionRatio);
        if (estimatedGrams != null && servingG.compareTo(BigDecimal.ZERO) > 0) {
            estimatedGrams = servingG.multiply(portionRatio).setScale(0, RoundingMode.HALF_UP);
        }

        Map<String, BigDecimal> nutrihome = ResNetFoodDefaults.scaledMacros(chosenCode, portionRatio);
        BigDecimal cal = nutrihome.get("calories");
        BigDecimal pro = nutrihome.get("protein");
        BigDecimal carb = nutrihome.get("carbs");
        BigDecimal fat = nutrihome.get("fat");

        boolean needsConfirmation = resnetNeedsConfirmation
                || confidence.compareTo(BigDecimal.valueOf(0.85)) < 0
                || (llavaUsed && llava.getConfidence() != null
                    && llava.getConfidence().compareTo(BigDecimal.valueOf(0.85)) < 0);

        return FusedMealAnalysis.builder()
                .foodCode(chosenCode)
                .foodNameVi(chosenName)
                .portionRatio(portionRatio)
                .estimatedTotalGrams(estimatedGrams)
                .calories(cal)
                .protein(pro)
                .carbs(carb)
                .fat(fat)
                .confidenceScore(confidence)
                .needsConfirmation(needsConfirmation)
                .llavaUsed(llavaUsed)
                .macroSource(macroSource)
                .fusionNote(fusionNote)
                .llavaResult(llava)
                .build();
    }

    private static BigDecimal clampPortionRatio(BigDecimal ratio) {
        if (ratio == null) {
            return BigDecimal.ONE;
        }
        BigDecimal min = BigDecimal.valueOf(0.4);
        BigDecimal max = BigDecimal.valueOf(2.2);
        if (ratio.compareTo(min) < 0) {
            return min;
        }
        if (ratio.compareTo(max) > 0) {
            return max;
        }
        return ratio;
    }

    private static BigDecimal blend(BigDecimal nutrihome, BigDecimal llava, double llavaWeight) {
        if (nutrihome == null) {
            return llava;
        }
        if (llava == null) {
            return nutrihome;
        }
        double nh = nutrihome.doubleValue();
        double lv = llava.doubleValue();
        return BigDecimal.valueOf(nh * (1 - llavaWeight) + lv * llavaWeight)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private static boolean isConfusionPairOverride(String resnetCode, String llavaCode) {
        if (resnetCode == null || llavaCode == null) {
            return false;
        }
        String r = resnetCode.toLowerCase(Locale.ROOT);
        String l = llavaCode.toLowerCase(Locale.ROOT);
        if ("com_tam".equals(l) && ("banh_khot".equals(r) || "ca_kho_to".equals(r))) {
            return true;
        }
        if ("pho".equals(l) && ("banh_khot".equals(r) || "banh_xeo".equals(r))) {
            return true;
        }
        if ("banh_khot".equals(l) && "com_tam".equals(r)) {
            return true;
        }
        if ("ca_kho_to".equals(l) && "pho".equals(r)) {
            return true;
        }
        return false;
    }

    public static String resolveFoodCode(String foodCodeGuess, String foodNameVi) {
        if (foodCodeGuess != null && !foodCodeGuess.isBlank() && !"unknown".equalsIgnoreCase(foodCodeGuess.trim())) {
            String code = foodCodeGuess.trim().toLowerCase(Locale.ROOT);
            if (ResNetFoodDefaults.forCode(code).isPresent()) {
                return code;
            }
        }
        return matchFromName(foodNameVi).orElse(null);
    }

    public static Optional<String> matchFromName(String name) {
        if (name == null || name.isBlank()) {
            return Optional.empty();
        }
        String n = normalize(name);
        if (containsAny(n, "com tam", "com suon", "cơm tấm", "cơm sườn", "com tam suon")) {
            return Optional.of("com_tam");
        }
        if (containsAny(n, "pho ga", "phở gà")) {
            return Optional.of("pho");
        }
        if (containsAny(n, "pho", "phở")) {
            return Optional.of("pho");
        }
        if (containsAny(n, "banh khot", "bánh khọt")) {
            return Optional.of("banh_khot");
        }
        if (containsAny(n, "banh xeo", "bánh xèo")) {
            return Optional.of("banh_xeo");
        }
        if (containsAny(n, "banh mi", "bánh mì")) {
            return Optional.of("banh_mi");
        }
        if (containsAny(n, "ca kho", "cá kho", "ca loc kho")) {
            return Optional.of("ca_kho_to");
        }
        if (containsAny(n, "bun dau", "bún đậu")) {
            return Optional.of("bun_dau_mam_tom");
        }
        if (containsAny(n, "goi cuon", "gỏi cuốn")) {
            return Optional.of("goi_cuon");
        }
        if (containsAny(n, "banh chung", "bánh chưng")) {
            return Optional.of("banh_chung");
        }
        if (containsAny(n, "banh trang", "bánh tráng")) {
            return Optional.of("banh_trang_nuong");
        }
        return Optional.empty();
    }

    private static boolean containsAny(String n, String... needles) {
        for (String needle : needles) {
            if (n.contains(normalize(needle))) {
                return true;
            }
        }
        return false;
    }

    private static String normalize(String s) {
        String temp = Normalizer.normalize(s.toLowerCase(Locale.ROOT), Normalizer.Form.NFD);
        return temp.replaceAll("\\p{M}", "").trim();
    }
}

