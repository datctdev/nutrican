package com.sba.nutricanbe.ai.util;

import com.sba.nutricanbe.ai.catalog.FoodCodeCategory;
import com.sba.nutricanbe.ai.dto.LlavaMealAnalysisResult;
import com.sba.nutricanbe.ai.catalog.ResNetClassManifest;
import com.sba.nutricanbe.ai.catalog.ResNetFoodDefaults;
import com.sba.nutricanbe.ai.catalog.ResNetFoodCodeMapping;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;


public final class MealAnalysisFusion {

    public static final String SOURCE_HYBRID_LLAVA = "HYBRID_LLAVA_NUTRIHOME";
    public static final String SOURCE_RESNET_NUTRIHOME = "RESNET_NUTRIHOME";
    public static final String SOURCE_LLAVA_ONLY = "LLAVA_NUTRIHOME";


    public static final BigDecimal AUTO_ACCEPT_RELIABILITY = BigDecimal.valueOf(0.90);

    private static final BigDecimal LLAVA_OVERRIDE_THRESHOLD = BigDecimal.valueOf(0.55);
    private static final BigDecimal RESNET_LOW_THRESHOLD = BigDecimal.valueOf(0.08);
    private static final BigDecimal CONFUSION_PAIR_THRESHOLD = BigDecimal.valueOf(0.42);
    private static final BigDecimal LLAVA_GRAM_TRUST_THRESHOLD = BigDecimal.valueOf(0.55);

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
        return fuse(resnetFoodCode, resnetFoodName, resnetConfidence, null,
                resnetPortionRatio, resnetNeedsConfirmation, llava);
    }

    public static FusedMealAnalysis fuse(
            String resnetFoodCode,
            String resnetFoodName,
            BigDecimal resnetConfidence,
            BigDecimal resnetConfidenceMargin,
            BigDecimal resnetPortionRatio,
            boolean resnetNeedsConfirmation,
            LlavaMealAnalysisResult llava) {

        String chosenCode = resnetFoodCode;
        String chosenName = resnetFoodName;
        BigDecimal resnetConf = resnetConfidence != null ? resnetConfidence : BigDecimal.ZERO;
        boolean llavaUsed = false;
        boolean llavaOverrideApplied = false;
        String llavaCodeGuessRaw = null;
        String llavaResolvedCode = null;
        String macroSource = SOURCE_RESNET_NUTRIHOME;
        String fusionNote = "ResNet + NutriHome PDF";

        if (llava != null && llava.isSuccess()) {
            llavaUsed = true;
            llavaCodeGuessRaw = llava.getMessage();
            llavaResolvedCode = resolveFoodCode(llavaCodeGuessRaw, llava.getFoodNameVi());
            BigDecimal llavaConf = llava.getConfidence() != null ? llava.getConfidence() : BigDecimal.ZERO;
            boolean resnetLow = resnetConf.compareTo(RESNET_LOW_THRESHOLD) < 0;
            boolean confusionOverride = isConfusionPairOverride(resnetFoodCode, llavaResolvedCode)
                    && llavaConf.compareTo(CONFUSION_PAIR_THRESHOLD) >= 0;

            if (shouldAcceptLlavaOverride(
                    resnetFoodCode, llavaResolvedCode, llavaCodeGuessRaw,
                    llavaConf, resnetLow, confusionOverride)) {
                chosenCode = llavaResolvedCode;
                chosenName = ResNetFoodCodeMapping.catalogNameViOrDisplay(
                        llavaResolvedCode,
                        llava.getFoodNameVi() != null ? llava.getFoodNameVi() : resnetFoodName);
                macroSource = confusionOverride || !llavaResolvedCode.equals(resnetFoodCode)
                        ? SOURCE_HYBRID_LLAVA : SOURCE_RESNET_NUTRIHOME;
                fusionNote = confusionOverride
                        ? "LLaVA fixed confusion (" + resnetFoodCode + "→" + llavaResolvedCode + ")"
                        : "LLaVA verified → " + chosenName;
                llavaOverrideApplied = !llavaResolvedCode.equals(resnetFoodCode);
            } else if (FoodCodeCategory.isCrossCuisineHallucination(resnetFoodCode, llavaResolvedCode)) {
                fusionNote = "LLaVA VN guess ignored — kept ResNet Food-101 hint";
            }
        }

        BigDecimal servingG = ResNetFoodDefaults.defaultServingG(chosenCode);
        boolean codesAgree = llavaResolvedCode != null && llavaResolvedCode.equals(chosenCode);
        boolean llavaGramsTrusted = llavaUsed && codesAgree
                && llava.getConfidence() != null
                && llava.getConfidence().compareTo(LLAVA_GRAM_TRUST_THRESHOLD) >= 0;

        BigDecimal estimatedGrams = estimateGrams(
                servingG, resnetPortionRatio, llava, llavaGramsTrusted || llavaOverrideApplied);

        BigDecimal portionRatio = resnetPortionRatio != null ? resnetPortionRatio : BigDecimal.ONE;
        if (estimatedGrams != null && servingG.compareTo(BigDecimal.ZERO) > 0) {
            portionRatio = estimatedGrams.divide(servingG, 3, RoundingMode.HALF_UP);
        }
        portionRatio = clampPortionRatio(portionRatio);
        if (estimatedGrams != null && servingG.compareTo(BigDecimal.ZERO) > 0) {
            estimatedGrams = servingG.multiply(portionRatio).setScale(0, RoundingMode.HALF_UP);
        }

        Map<String, BigDecimal> nutrihome = ResNetFoodDefaults.scaledMacros(chosenCode, portionRatio);

        BigDecimal reliability = computeReliability(
                resnetConf, resnetConfidenceMargin, chosenCode, resnetFoodCode,
                llavaResolvedCode, llavaUsed, llava != null ? llava.getConfidence() : null,
                llavaOverrideApplied, resnetNeedsConfirmation);

        boolean needsConfirmation = resnetNeedsConfirmation
                || reliability.compareTo(AUTO_ACCEPT_RELIABILITY) < 0
                || isAmbiguousConfusionPair(resnetFoodCode, chosenCode, resnetConfidenceMargin);

        return FusedMealAnalysis.builder()
                .foodCode(chosenCode)
                .foodNameVi(chosenName)
                .portionRatio(portionRatio)
                .estimatedTotalGrams(estimatedGrams)
                .calories(nutrihome.get("calories"))
                .protein(nutrihome.get("protein"))
                .carbs(nutrihome.get("carbs"))
                .fat(nutrihome.get("fat"))
                .confidenceScore(reliability)
                .needsConfirmation(needsConfirmation)
                .llavaUsed(llavaUsed)
                .macroSource(macroSource)
                .fusionNote(fusionNote)
                .llavaResult(llava)
                .build();
    }

    static boolean shouldAcceptLlavaOverride(
            String resnetCode,
            String llavaCode,
            String llavaCodeGuessRaw,
            BigDecimal llavaConf,
            boolean resnetLow,
            boolean confusionOverride) {
        if (llavaCode == null) {
            return false;
        }
        if (FoodCodeCategory.isCrossCuisineHallucination(resnetCode, llavaCode)) {
            return false;
        }
        boolean guessFromExplicitCode = llavaCodeGuessRaw != null
                && !"unknown".equalsIgnoreCase(llavaCodeGuessRaw.trim())
                && ResNetFoodCodeMapping.isKnownCode(llavaCodeGuessRaw.trim());

        if (confusionOverride) {
            return true;
        }
        if (resnetLow && llavaConf.compareTo(CONFUSION_PAIR_THRESHOLD) >= 0) {
            if (FoodCodeCategory.isFood101(resnetCode)) {
                return FoodCodeCategory.isFood101(llavaCode);
            }
            return FoodCodeCategory.isVietnamese(resnetCode) && FoodCodeCategory.isVietnamese(llavaCode);
        }
        if (llavaConf.compareTo(LLAVA_OVERRIDE_THRESHOLD) >= 0) {
            if (llavaCode.equals(resnetCode)) {
                return true;
            }
            if (FoodCodeCategory.isFood101(resnetCode) && FoodCodeCategory.isFood101(llavaCode)) {
                return guessFromExplicitCode || llavaConf.compareTo(BigDecimal.valueOf(0.65)) >= 0;
            }
            if (FoodCodeCategory.isVietnamese(resnetCode) && FoodCodeCategory.isVietnamese(llavaCode)) {
                return true;
            }
        }
        return false;
    }

    static BigDecimal computeReliability(
            BigDecimal resnetConf,
            BigDecimal resnetMargin,
            String finalCode,
            String resnetCode,
            String llavaCode,
            boolean llavaUsed,
            BigDecimal llavaConf,
            boolean llavaOverrideApplied,
            boolean resnetNeedsConfirmation) {

        double score = 0.0;
        double rc = resnetConf != null ? resnetConf.doubleValue() : 0.0;
        double margin = resnetMargin != null ? resnetMargin.doubleValue() : 0.0;

        if (margin >= 0.03) {
            score += 0.35;
        } else if (margin >= 0.015) {
            score += 0.20;
        }
        if (rc >= 0.12) {
            score += 0.25;
        } else if (rc >= 0.06) {
            score += 0.15;
        } else if (rc >= 0.03) {
            score += 0.08;
        }

        if (llavaUsed && llavaCode != null && llavaCode.equals(finalCode)) {
            score += 0.20;
            if (llavaConf != null && llavaConf.doubleValue() >= 0.70) {
                score += 0.10;
            }
        } else if (!llavaOverrideApplied) {
            score += 0.10;
        }

        if (llavaOverrideApplied && !isConfusionPairOverride(resnetCode, finalCode)) {
            score -= 0.25;
        }
        if (FoodCodeCategory.isCrossCuisineHallucination(resnetCode, llavaCode)) {
            score -= 0.35;
        }
        if (isAmbiguousConfusionPair(resnetCode, finalCode, resnetMargin)) {
            score -= 0.20;
        }
        if (resnetNeedsConfirmation) {
            score -= 0.10;
        }

        score = Math.max(0.0, Math.min(1.0, score));
        return BigDecimal.valueOf(score).setScale(3, RoundingMode.HALF_UP);
    }

    private static BigDecimal estimateGrams(
            BigDecimal servingG,
            BigDecimal resnetPortionRatio,
            LlavaMealAnalysisResult llava,
            boolean trustLlavaGrams) {

        BigDecimal ratio = resnetPortionRatio != null ? resnetPortionRatio : BigDecimal.ONE;
        BigDecimal fromResnet = servingG.multiply(ratio).setScale(0, RoundingMode.HALF_UP);

        if (trustLlavaGrams && llava != null && llava.getEstimatedTotalGrams() != null
                && llava.getEstimatedTotalGrams().compareTo(BigDecimal.ZERO) > 0) {
            double blended = llava.getEstimatedTotalGrams().doubleValue() * 0.65
                    + fromResnet.doubleValue() * 0.35;
            return BigDecimal.valueOf(blended).setScale(0, RoundingMode.HALF_UP);
        }
        return fromResnet;
    }

    private static boolean isAmbiguousConfusionPair(
            String resnetCode, String finalCode, BigDecimal margin) {
        if (margin != null && margin.doubleValue() >= 0.02) {
            return false;
        }
        return isConfusionPairOverride(resnetCode, finalCode)
                || isConfusionPairOverride(finalCode, resnetCode);
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

    static boolean isConfusionPairOverride(String resnetCode, String llavaCode) {
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
        if ("beef_tartare".equals(l) && "beef_carpaccio".equals(r)) {
            return true;
        }
        if ("beef_carpaccio".equals(l) && "beef_tartare".equals(r)) {
            return true;
        }
        if ("filet_mignon".equals(l) && ("beef_carpaccio".equals(r) || "beef_tartare".equals(r))) {
            return true;
        }
        return false;
    }

    public static String resolveFoodCode(String foodCodeGuess, String foodNameVi) {
        if (foodCodeGuess != null && !foodCodeGuess.isBlank() && !"unknown".equalsIgnoreCase(foodCodeGuess.trim())) {
            String code = foodCodeGuess.trim().toLowerCase(Locale.ROOT);
            if (ResNetFoodCodeMapping.isKnownCode(code)) {
                return ResNetClassManifest.normalizeCode(code);
            }
        }
        return matchFromName(foodNameVi).orElse(null);
    }

    public static Optional<String> matchFromName(String name) {
        if (name == null || name.isBlank()) {
            return Optional.empty();
        }
        String n = normalize(name);

        Optional<String> fromManifest = matchFromManifestDisplayName(n);
        if (fromManifest.isPresent()) {
            return fromManifest;
        }

        if (containsAny(n, "beef tartare", "bo tartare", "tartare", "thit bo song bam")) {
            if (!containsAny(n, "carpaccio")) {
                return Optional.of("beef_tartare");
            }
        }
        if (containsAny(n, "beef carpaccio", "carpaccio")) {
            return Optional.of("beef_carpaccio");
        }
        if (containsAny(n, "com tam", "com suon", "com tam suon")) {
            return Optional.of("com_tam");
        }
        if (containsAny(n, "pho ga")) {
            return Optional.of("pho");
        }
        if (containsAny(n, "pho") && !containsAny(n, "carpaccio", "tartare", "salad")) {
            return Optional.of("pho");
        }
        if (containsAny(n, "banh khot")) {
            return Optional.of("banh_khot");
        }
        if (containsAny(n, "banh xeo")) {
            return Optional.of("banh_xeo");
        }
        if (containsAny(n, "banh mi")) {
            return Optional.of("banh_mi");
        }
        if (containsAny(n, "ca kho", "ca loc kho")) {
            return Optional.of("ca_kho_to");
        }
        if (containsAny(n, "bun dau")) {
            return Optional.of("bun_dau_mam_tom");
        }
        if (containsAny(n, "goi cuon")) {
            return Optional.of("goi_cuon");
        }
        if (containsAny(n, "banh chung")) {
            return Optional.of("banh_chung");
        }
        if (containsAny(n, "banh trang")) {
            return Optional.of("banh_trang_nuong");
        }
        return Optional.empty();
    }

    static Optional<String> matchFromManifestDisplayName(String normalizedName) {
        if (normalizedName.length() < 4) {
            return Optional.empty();
        }
        String bestCode = null;
        int bestLen = 0;
        for (Map.Entry<String, String> entry : ResNetFoodCodeMapping.allMappings().entrySet()) {
            String display = normalize(entry.getValue());
            String codeWords = normalize(entry.getKey().replace('_', ' '));
            if (normalizedName.equals(display) || normalizedName.equals(codeWords)) {
                return Optional.of(entry.getKey());
            }
            if (normalizedName.contains(display) && display.length() > bestLen) {
                bestCode = entry.getKey();
                bestLen = display.length();
            }
        }
        return bestCode != null ? Optional.of(bestCode) : Optional.empty();
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
