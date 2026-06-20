package com.sba.nutrican_be.ai.service.impl;

import com.sba.nutrican_be.ai.MealRecognitionResult;
import com.sba.nutrican_be.ai.ResNetFoodCodeMapping;
import com.sba.nutrican_be.ai.dto.ResNetAnalyzeResponse;
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
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MealRecognitionServiceImpl implements MealRecognitionService {

    private static final BigDecimal DEFAULT_PORTION_G = BigDecimal.valueOf(100);

    private final ResNetFoodRecognitionClient resNetClient;

    @Value("${ai.resnet.confidence-threshold:0.25}")
    private double confidenceThreshold;

    @Override
    public MealRecognitionResult recognizeMeal(String imageUrl, String mealType) {
        log.warn("URL-based recognition is not supported for ResNet50; imageUrl={}", imageUrl);
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
        BigDecimal confidence = BigDecimal.valueOf(data.getConfidence())
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        boolean fallback = confidence.compareTo(BigDecimal.valueOf(confidenceThreshold)) < 0;

        Map<String, Number> macros = data.getMacros() != null ? data.getMacros() : Collections.emptyMap();
        String foodCode = data.getFoodCode();
        String foodName = ResNetFoodCodeMapping.catalogNameViOrDisplay(foodCode, data.getFoodName());

        log.info("ResNet prediction: code={}, name={}, confidence={}", foodCode, foodName, confidence);

        return MealRecognitionResult.builder()
                .foodName(foodName)
                .foodCode(foodCode)
                .portionSize(DEFAULT_PORTION_G)
                .portionUnit("grams")
                .calories(toBd(macros.get("calories")))
                .protein(toBd(macros.get("protein")))
                .carbs(toBd(macros.get("carbs")))
                .fat(toBd(macros.get("fat")))
                .confidenceScore(confidence)
                .fallback(fallback)
                .message(fallback ? "Low confidence prediction" : "")
                .mealComplexityFromAi("SIMPLE")
                .detectedItems(Collections.emptyList())
                .uncertaintyReasons(fallback ? Collections.singletonList("LOW_CONFIDENCE") : Collections.emptyList())
                .build();
    }

    @Override
    public boolean isAvailable() {
        return resNetClient.isHealthy();
    }

    @Override
    public String getModelName() {
        return ResNetFoodCodeMapping.MODEL_VERSION;
    }

    @Override
    public String getPromptVersionHash() {
        return PromptVersionUtil.hashPrompt(String.join(",", ResNetFoodCodeMapping.classOrder()));
    }

    private MealRecognitionResult buildFallbackResult(String message) {
        return MealRecognitionResult.builder()
                .foodName("Meal")
                .portionSize(DEFAULT_PORTION_G)
                .portionUnit("grams")
                .calories(BigDecimal.valueOf(300))
                .protein(BigDecimal.valueOf(15))
                .carbs(BigDecimal.valueOf(35))
                .fat(BigDecimal.valueOf(10))
                .confidenceScore(BigDecimal.ZERO)
                .fallback(true)
                .message(message)
                .mealComplexityFromAi("SIMPLE")
                .build();
    }

    private BigDecimal toBd(Number value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(value.doubleValue());
    }
}
