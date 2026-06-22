package com.sba.nutrican_be.ai.service.impl;

import com.sba.nutrican_be.ai.util.MealAnalysisFusion;
import com.sba.nutrican_be.ai.dto.MealRecognitionResult;
import com.sba.nutrican_be.ai.catalog.ResNetFoodCodeMapping;
import com.sba.nutrican_be.ai.dto.FoodPredictionDto;
import com.sba.nutrican_be.ai.dto.LlavaMealAnalysisResult;
import com.sba.nutrican_be.ai.dto.ResNetAnalyzeResponse;
import com.sba.nutrican_be.ai.service.LlavaMealAnalysisService;
import com.sba.nutrican_be.ai.service.MealRecognitionService;
import com.sba.nutrican_be.ai.service.ResNetFoodRecognitionClient;
import com.sba.nutrican_be.core.exception.BadRequestException;
import com.sba.nutrican_be.core.util.PromptVersionUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MealRecognitionServiceImpl implements MealRecognitionService {

    private static final BigDecimal DEFAULT_PORTION_RATIO = BigDecimal.ONE;

    private final ResNetFoodRecognitionClient resNetClient;
    private final LlavaMealAnalysisService llavaMealAnalysisService;

    @Value("${ai.resnet.confidence-threshold:0.25}")
    private double confidenceThreshold;

    @Override
    public MealRecognitionResult recognizeMeal(String imageUrl, String mealType) {
        log.warn("URL-based recognition is not supported; imageUrl={}", imageUrl);
        return buildFallbackResult("ResNet50 requires image file upload, not URL");
    }

    @Override
    public MealRecognitionResult recognizeMealFromFile(MultipartFile file, String mealType) {
        return recognizeMealFromFile(file, mealType, null, null);
    }

    @Override
    public MealRecognitionResult recognizeMealFromFile(
            MultipartFile file, String mealType, String mealSource, String mealComplexity) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Image file is required");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException("File must be an image");
        }

        ResNetAnalyzeResponse response = resNetClient.analyze(file);
        if (response == null || !response.isSuccess() || response.getData() == null) {
            String msg = response != null && response.getMessage() != null
                    ? response.getMessage()
                    : "ResNet AI service returned no result";
            return buildFallbackResult(msg);
        }

        ResNetAnalyzeResponse.DataPayload data = response.getData();
        BigDecimal resnetConfidence = BigDecimal.valueOf(data.getConfidence())
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        boolean resnetFallback = resnetConfidence.compareTo(BigDecimal.valueOf(confidenceThreshold)) < 0;

        String resnetCode = data.getFoodCode();
        String resnetName = ResNetFoodCodeMapping.catalogNameViOrDisplay(resnetCode, data.getFoodName());
        BigDecimal resnetPortionRatio = data.getPortionRatio() != null
                ? BigDecimal.valueOf(data.getPortionRatio()).setScale(3, RoundingMode.HALF_UP)
                : DEFAULT_PORTION_RATIO;

        List<FoodPredictionDto> topPredictions = data.getTopPredictions() != null
                ? data.getTopPredictions()
                : Collections.emptyList();
        boolean resnetNeedsConfirmation = Boolean.TRUE.equals(data.getNeedsConfirmation());

        // LLaVA vision analysis (Ollama) — corrects ResNet on dishes like com tam suon
        LlavaMealAnalysisResult llava = llavaMealAnalysisService.analyzeMealImage(file, resnetName, resnetCode);
        if (llava.isSuccess()) {
            log.info("LLaVA: name={}, grams={}, conf={}, codeGuess={}",
                    llava.getFoodNameVi(), llava.getEstimatedTotalGrams(), llava.getConfidence(), llava.getMessage());
        } else {
            log.info("LLaVA skipped: {}", llava.getMessage());
        }

        MealAnalysisFusion.FusedMealAnalysis fused = MealAnalysisFusion.fuse(
                resnetCode, resnetName, resnetConfidence, resnetPortionRatio,
                resnetNeedsConfirmation, llava);

        log.info("Fused meal: code={}, name={}, grams={}, kcal={}, source={}",
                fused.getFoodCode(), fused.getFoodNameVi(), fused.getEstimatedTotalGrams(),
                fused.getCalories(), fused.getMacroSource());

        BigDecimal foodAreaRatio = data.getFoodAreaRatio() != null
                ? BigDecimal.valueOf(data.getFoodAreaRatio()).setScale(4, RoundingMode.HALF_UP)
                : null;
        BigDecimal confidenceMargin = data.getConfidenceMargin() != null
                ? BigDecimal.valueOf(data.getConfidenceMargin()).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP)
                : null;

        return MealRecognitionResult.builder()
                .foodName(fused.getFoodNameVi())
                .foodCode(fused.getFoodCode())
                .portionRatio(fused.getPortionRatio())
                .estimatedTotalGrams(fused.getEstimatedTotalGrams())
                .foodAreaRatio(foodAreaRatio)
                .portionSize(fused.getEstimatedTotalGrams())
                .portionUnit("grams")
                .calories(fused.getCalories())
                .protein(fused.getProtein())
                .carbs(fused.getCarbs())
                .fat(fused.getFat())
                .confidenceScore(fused.getConfidenceScore())
                .confidenceMargin(confidenceMargin)
                .needsConfirmation(fused.isNeedsConfirmation())
                .topPredictions(topPredictions)
                .llavaUsed(fused.isLlavaUsed())
                .macroSource(fused.getMacroSource())
                .fusionNote(fused.getFusionNote())
                .llavaFoodName(llava.isSuccess() ? llava.getFoodNameVi() : null)
                .fallback(resnetFallback && !fused.isLlavaUsed())
                .message(fused.getFusionNote())
                .mealComplexityFromAi("SIMPLE")
                .detectedItems(Collections.emptyList())
                .uncertaintyReasons(fused.isNeedsConfirmation()
                        ? Collections.singletonList("LOW_CONFIDENCE") : Collections.emptyList())
                .build();
    }

    @Override
    public boolean isAvailable() {
        return resNetClient.isHealthy();
    }

    @Override
    public String getModelName() {
        return ResNetFoodCodeMapping.MODEL_VERSION + "-hybrid-llava";
    }

    @Override
    public String getPromptVersionHash() {
        return PromptVersionUtil.hashPrompt(String.join(",", ResNetFoodCodeMapping.classOrder())
                + ":nutrihome-llava-v1");
    }

    private MealRecognitionResult buildFallbackResult(String message) {
        return MealRecognitionResult.builder()
                .foodName("Meal")
                .portionRatio(DEFAULT_PORTION_RATIO)
                .needsConfirmation(true)
                .topPredictions(Collections.emptyList())
                .fallback(true)
                .message(message)
                .mealComplexityFromAi("SIMPLE")
                .detectedItems(Collections.emptyList())
                .uncertaintyReasons(Collections.singletonList("LOW_CONFIDENCE"))
                .build();
    }
}

