package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.diet.dto.request.AnalyzeMealContext;
import com.sba.nutricanbe.diet.dto.request.ConfirmRecognitionRequest;
import com.sba.nutricanbe.diet.dto.response.AnalyzeMealResponse;
import com.sba.nutricanbe.diet.dto.response.DietLogResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface MealAnalysisService {
    ApiResponse<AnalyzeMealResponse> analyzeMeal(UUID customerId, MultipartFile file, AnalyzeMealContext context);
    ApiResponse<DietLogResponse> confirmRecognition(UUID logId, UUID customerId, ConfirmRecognitionRequest request);
}
