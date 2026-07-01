package com.sba.nutricanbe.ai.util;

import com.sba.nutricanbe.ai.dto.LlavaMealAnalysisResult;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MealAnalysisFusionTest {

    static {
        com.sba.nutricanbe.ai.catalog.ResNetClassManifest.setActiveProfile("resnet_unified");
        com.sba.nutricanbe.ai.catalog.NutriHomeCatalog.ensureLoaded();
    }

    @Test
    void rejectsLlavaVnHallucinationOnFood101ResnetHint() {
        LlavaMealAnalysisResult llava = LlavaMealAnalysisResult.builder()
                .success(true)
                .foodNameVi("Phở bò tái")
                .message("pho")
                .confidence(BigDecimal.valueOf(0.85))
                .estimatedTotalGrams(BigDecimal.valueOf(500))
                .build();

        MealAnalysisFusion.FusedMealAnalysis fused = MealAnalysisFusion.fuse(
                "beef_carpaccio",
                "Beef Carpaccio",
                BigDecimal.valueOf(0.01),
                BigDecimal.valueOf(0.005),
                BigDecimal.valueOf(1.0),
                true,
                llava);

        assertEquals("beef_carpaccio", fused.getFoodCode());
        assertTrue(fused.isNeedsConfirmation());
        assertTrue(fused.getConfidenceScore().compareTo(MealAnalysisFusion.AUTO_ACCEPT_RELIABILITY) < 0);
    }

    @Test
    void acceptsLlavaBeefTartareFixForCarpaccioConfusion() {
        LlavaMealAnalysisResult llava = LlavaMealAnalysisResult.builder()
                .success(true)
                .foodNameVi("Beef Tartare")
                .message("beef_tartare")
                .confidence(BigDecimal.valueOf(0.72))
                .estimatedTotalGrams(BigDecimal.valueOf(180))
                .build();

        MealAnalysisFusion.FusedMealAnalysis fused = MealAnalysisFusion.fuse(
                "beef_carpaccio",
                "Beef Carpaccio",
                BigDecimal.valueOf(0.01),
                BigDecimal.valueOf(0.002),
                BigDecimal.valueOf(1.2),
                true,
                llava);

        assertEquals("beef_tartare", fused.getFoodCode());
        assertEquals("Beef Tartare", fused.getFoodNameVi());
    }

    @Test
    void matchFromNameResolvesBeefTartare() {
        assertEquals("beef_tartare", MealAnalysisFusion.matchFromName("Beef Tartare").orElseThrow());
        assertEquals("beef_tartare", MealAnalysisFusion.matchFromName("tartare").orElseThrow());
    }

    @Test
    void reliabilityLowWhenMarginTiny() {
        MealAnalysisFusion.FusedMealAnalysis fused = MealAnalysisFusion.fuse(
                "beef_carpaccio",
                "Beef Carpaccio",
                BigDecimal.valueOf(0.01),
                BigDecimal.valueOf(0.001),
                BigDecimal.valueOf(1.0),
                true,
                null);

        assertTrue(fused.getConfidenceScore().compareTo(BigDecimal.valueOf(0.90)) < 0);
        assertTrue(fused.isNeedsConfirmation());
    }

    @Test
    void crossCuisineOverrideBlocked() {
        assertFalse(MealAnalysisFusion.shouldAcceptLlavaOverride(
                "beef_carpaccio",
                "pho",
                "pho",
                BigDecimal.valueOf(0.90),
                true,
                false));
    }

    @Test
    void confusionPairDetectedBothDirections() {
        assertTrue(MealAnalysisFusion.isConfusionPairOverride("beef_carpaccio", "beef_tartare"));
        assertTrue(MealAnalysisFusion.isConfusionPairOverride("beef_tartare", "beef_carpaccio"));
    }
}
