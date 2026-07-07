package com.sba.nutricanbe.ai.service.impl;

import com.sba.nutricanbe.ai.catalog.ResNetClassManifest;
import com.sba.nutricanbe.ai.dto.FoodGatePreCheckResult;
import com.sba.nutricanbe.ai.dto.MealRecognitionResult;
import com.sba.nutricanbe.ai.dto.ResNetAnalyzeResponse;
import com.sba.nutricanbe.ai.service.FoodGateService;
import com.sba.nutricanbe.ai.service.ResNetFoodRecognitionClient;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.diet.enums.FoodGateResult;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class FoodGateServiceImpl implements FoodGateService {

    private final ResNetFoodRecognitionClient resNetClient;

    @Value("${ai.gate.min-food-confidence:0.12}")
    private BigDecimal minFoodConfidence;

    @Override
    public FoodGateResult check(MealRecognitionResult aiResult) {
        if (aiResult == null) {
            return FoodGateResult.NOT_FOOD;
        }
        BigDecimal confidence = aiResult.getConfidenceScore();
        if (confidence == null || confidence.compareTo(minFoodConfidence) < 0) {
            return FoodGateResult.NOT_FOOD;
        }
        String foodCode = aiResult.getFoodCode();
        if (foodCode == null || foodCode.isBlank()) {
            return FoodGateResult.NOT_FOOD;
        }
        if (!ResNetClassManifest.isKnownCode(foodCode)) {
            return FoodGateResult.OUT_OF_CLASS;
        }
        return FoodGateResult.PASS;
    }

    @Override
    public FoodGatePreCheckResult preCheck(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Image file is required");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException("File must be an image");
        }
        ResNetAnalyzeResponse response = resNetClient.analyze(file);
        MealRecognitionResult preview = toPreview(response);
        return new FoodGatePreCheckResult(check(preview), response);
    }

    static MealRecognitionResult toPreview(ResNetAnalyzeResponse response) {
        if (response == null || !response.isSuccess() || response.getData() == null) {
            return MealRecognitionResult.builder()
                    .confidenceScore(BigDecimal.ZERO)
                    .build();
        }
        ResNetAnalyzeResponse.DataPayload data = response.getData();
        BigDecimal confidence = BigDecimal.valueOf(data.getConfidence())
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        return MealRecognitionResult.builder()
                .foodCode(data.getFoodCode())
                .foodName(data.getFoodName())
                .confidenceScore(confidence)
                .build();
    }
}
