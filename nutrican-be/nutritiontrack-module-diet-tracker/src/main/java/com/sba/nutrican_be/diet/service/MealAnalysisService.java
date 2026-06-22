package com.sba.nutrican_be.diet.service;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.diet.dto.AnalyzeMealContext;
import com.sba.nutrican_be.diet.dto.AnalyzeMealResponse;
import com.sba.nutrican_be.diet.dto.ConfirmRecognitionRequest;
import com.sba.nutrican_be.diet.dto.DietLogResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface MealAnalysisService {
    ApiResponse<AnalyzeMealResponse> analyzeMeal(UUID customerId, MultipartFile file, AnalyzeMealContext context);
    ApiResponse<DietLogResponse> confirmRecognition(UUID logId, UUID customerId, ConfirmRecognitionRequest request);
}
