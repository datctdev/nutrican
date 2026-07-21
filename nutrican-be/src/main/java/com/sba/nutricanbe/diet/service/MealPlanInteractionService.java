package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.diet.dto.request.MealPlanMealActionRequest;
import com.sba.nutricanbe.diet.dto.request.MealPlanSkipRequest;
import com.sba.nutricanbe.diet.dto.request.MealPlanSuggestionRequest;
import com.sba.nutricanbe.diet.dto.response.MealPlanDetailResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanItemResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanSuggestionResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanWeeklySummaryResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanWeekResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Customer-facing meal-plan interactions: viewing the published plan and reacting to it
 * (mark eaten, skip, request replacements).
 */
public interface MealPlanInteractionService {

    MealPlanDetailResponse getCurrentPlan(UUID customerId, LocalDate weekStart);

    List<MealPlanWeekResponse> getPublishedPlanWeeks(UUID customerId);

    List<MealPlanWeeklySummaryResponse> getWeeklySummaries(UUID customerId);

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
