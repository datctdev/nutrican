package com.sba.nutricanbe.workspace.service;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.diet.dto.request.SelfPlanSubmissionReviewRequest;
import com.sba.nutricanbe.diet.dto.response.SelfPlanSubmissionResponse;
import com.sba.nutricanbe.workspace.dto.MealPlanSuggestionDto;
import com.sba.nutricanbe.workspace.dto.MealPlanSuggestionReviewRequest;
import com.sba.nutricanbe.workspace.dto.WeeklySummaryDto;
import com.sba.nutricanbe.workspace.dto.WeeklySummaryRequest;

import java.util.List;
import java.util.UUID;

public interface PtReviewService {

    ApiResponse<MealPlanSuggestionDto> reviewMealPlanSuggestion(
            UUID ptId, UUID suggestionId, MealPlanSuggestionReviewRequest request);

    ApiResponse<List<MealPlanSuggestionDto>> getPendingMealPlanSuggestions(UUID ptId, UUID clientId);

    ApiResponse<WeeklySummaryDto> createWeeklySummary(UUID ptId, WeeklySummaryRequest request);

    ApiResponse<List<SelfPlanSubmissionResponse>> listPendingSelfPlanSubmissions(UUID ptId);

    ApiResponse<SelfPlanSubmissionResponse> reviewSelfPlanSubmission(
            UUID ptId, UUID submissionId, SelfPlanSubmissionReviewRequest request);
}
