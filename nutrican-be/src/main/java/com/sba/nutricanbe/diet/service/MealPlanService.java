package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.diet.dto.request.MealPlanMealActionRequest;
import com.sba.nutricanbe.diet.dto.request.MealPlanRequest;
import com.sba.nutricanbe.diet.dto.request.MealPlanSkipRequest;
import com.sba.nutricanbe.diet.dto.request.MealPlanSuggestionRequest;
import com.sba.nutricanbe.diet.dto.response.MealPlanDetailResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanItemResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanSaveResult;
import com.sba.nutricanbe.diet.dto.response.MealPlanSuggestionResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanWeeklySummaryResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanWeekResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface MealPlanService {
    MealPlanSaveResult createPlan(UUID ptId, MealPlanRequest request);

    MealPlanSaveResult updatePlan(UUID ptId, UUID clientId, MealPlanRequest request);

    MealPlanDetailResponse getClientPlan(UUID ptId, UUID clientId, LocalDate weekStart);

    MealPlanDetailResponse getCurrentPlan(UUID customerId, LocalDate weekStart);

    List<MealPlanWeekResponse> getPublishedPlanWeeks(UUID customerId);

    List<MealPlanWeeklySummaryResponse> getWeeklySummaries(UUID customerId);

    void publishPlan(UUID ptId, UUID planId);

    MealPlanItemResponse markEaten(UUID customerId, UUID itemId, boolean eaten, String lateTickReason);

    MealPlanSuggestionResponse suggestReplacement(
            UUID customerId, UUID itemId, MealPlanSuggestionRequest request);

    MealPlanItemResponse skipItem(UUID customerId, UUID itemId, MealPlanSkipRequest request);

    MealPlanItemResponse unskipItem(UUID customerId, UUID itemId);

    List<MealPlanItemResponse> skipMeal(
            UUID customerId, UUID planId, MealPlanMealActionRequest request);

    List<MealPlanItemResponse> unskipMeal(
            UUID customerId, UUID planId, MealPlanMealActionRequest request);

    List<MealPlanSuggestionResponse> getCustomerSuggestions(UUID customerId, LocalDate weekStart);

    MealPlanSuggestionResponse cancelReplacementRequest(UUID customerId, UUID suggestionId);
}
