package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.diet.dto.request.AnalyzeMealContext;
import com.sba.nutricanbe.diet.dto.request.ConfirmRecognitionRequest;
import com.sba.nutricanbe.diet.dto.response.AnalyzeMealResponse;
import com.sba.nutricanbe.diet.dto.response.DietLogResponse;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.UUID;

public interface MealAnalysisService {

    ApiResponse<AnalyzeMealResponse> analyzeMeal(UUID customerId, MultipartFile file, AnalyzeMealContext context);

    ApiResponse<AnalyzeMealResponse> analyzeMeal(
            UUID customerId,
            MultipartFile file,
            String mealType,
            String mealPeriod,
            String makeupForPeriod,
            LocalDate logDate,
            String mealSource,
            String mealComplexity,
            String restaurantName,
            UUID hotpotBrothId,
            UUID[] hotpotItemIds,
            String hotpotPortions,
            UUID[] compositeItemIds,
            String compositePortions);

    ApiResponse<DietLogResponse> confirmRecognition(UUID logId, UUID customerId, ConfirmRecognitionRequest request);
}
