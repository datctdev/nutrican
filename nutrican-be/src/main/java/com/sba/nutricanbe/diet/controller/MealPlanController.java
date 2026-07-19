package com.sba.nutricanbe.diet.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
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
import com.sba.nutricanbe.diet.service.MealPlanService;
import com.sba.nutricanbe.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class MealPlanController {

    private final MealPlanService mealPlanService;

    @PostMapping("/api/v1/workspace/meal-plans")
    @PreAuthorize("hasAnyRole('PT_CERTIFIED', 'PT_FREELANCE')")
    public ResponseEntity<ApiResponse<MealPlanSaveResult>> createPlan(
            @AuthenticationPrincipal User pt,
            @RequestBody MealPlanRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                mealPlanService.createPlan(pt.getId(), request), "Meal plan created"));
    }

    @PutMapping("/api/v1/workspace/meal-plans/{clientId}")
    @PreAuthorize("hasAnyRole('PT_CERTIFIED', 'PT_FREELANCE')")
    public ResponseEntity<ApiResponse<MealPlanSaveResult>> updatePlan(
            @AuthenticationPrincipal User pt,
            @PathVariable UUID clientId,
            @RequestBody MealPlanRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                mealPlanService.updatePlan(pt.getId(), clientId, request), "Meal plan updated"));
    }

    @GetMapping("/api/v1/workspace/meal-plans/{clientId}")
    @PreAuthorize("hasAnyRole('PT_CERTIFIED', 'PT_FREELANCE')")
    public ResponseEntity<ApiResponse<MealPlanDetailResponse>> getClientPlan(
            @AuthenticationPrincipal User pt,
            @PathVariable UUID clientId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return ResponseEntity.ok(ApiResponse.success(
                mealPlanService.getClientPlan(pt.getId(), clientId, weekStart)));
    }

    @PostMapping("/api/v1/workspace/meal-plans/{planId}/publish")
    @PreAuthorize("hasAnyRole('PT_CERTIFIED', 'PT_FREELANCE')")
    public ResponseEntity<ApiResponse<Void>> publishPlan(
            @AuthenticationPrincipal User pt,
            @PathVariable UUID planId) {
        mealPlanService.publishPlan(pt.getId(), planId);
        return ResponseEntity.ok(ApiResponse.success(null, "Meal plan published"));
    }

    @GetMapping("/api/v1/meal-plans/current")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<MealPlanDetailResponse>> getCurrentPlan(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return ResponseEntity.ok(ApiResponse.success(
                mealPlanService.getCurrentPlan(user.getId(), weekStart)));
    }

    @GetMapping("/api/v1/meal-plans/weeks")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<MealPlanWeekResponse>>> getPublishedPlanWeeks(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(
                mealPlanService.getPublishedPlanWeeks(user.getId())));
    }

    @GetMapping("/api/v1/meal-plans/weekly-summaries")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<MealPlanWeeklySummaryResponse>>> getWeeklySummaries(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(
                mealPlanService.getWeeklySummaries(user.getId())));
    }

    @PutMapping("/api/v1/meal-plans/items/{itemId}/eaten")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<MealPlanItemResponse>> markEaten(
            @AuthenticationPrincipal User user,
            @PathVariable UUID itemId,
            @RequestParam(defaultValue = "true") boolean eaten) {
        return ResponseEntity.ok(ApiResponse.success(
                mealPlanService.markEaten(user.getId(), itemId, eaten)));
    }

    @PostMapping("/api/v1/meal-plans/items/{itemId}/suggest")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<MealPlanSuggestionResponse>> suggestReplacement(
            @AuthenticationPrincipal User user,
            @PathVariable UUID itemId,
            @RequestBody MealPlanSuggestionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                mealPlanService.suggestReplacement(user.getId(), itemId, request),
                "Suggestion submitted"));
    }

    @PutMapping("/api/v1/meal-plans/items/{itemId}/skip")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<MealPlanItemResponse>> skipItem(
            @AuthenticationPrincipal User user,
            @PathVariable UUID itemId,
            @RequestBody MealPlanSkipRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                mealPlanService.skipItem(user.getId(), itemId, request), "Item skipped"));
    }

    @PutMapping("/api/v1/meal-plans/items/{itemId}/unskip")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<MealPlanItemResponse>> unskipItem(
            @AuthenticationPrincipal User user,
            @PathVariable UUID itemId) {
        return ResponseEntity.ok(ApiResponse.success(
                mealPlanService.unskipItem(user.getId(), itemId), "Skipped state cleared"));
    }

    @PutMapping("/api/v1/meal-plans/{planId}/meals/skip")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<MealPlanItemResponse>>> skipMeal(
            @AuthenticationPrincipal User user,
            @PathVariable UUID planId,
            @RequestBody MealPlanMealActionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                mealPlanService.skipMeal(user.getId(), planId, request), "Meal skipped"));
    }

    @PutMapping("/api/v1/meal-plans/{planId}/meals/unskip")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<MealPlanItemResponse>>> unskipMeal(
            @AuthenticationPrincipal User user,
            @PathVariable UUID planId,
            @RequestBody MealPlanMealActionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                mealPlanService.unskipMeal(user.getId(), planId, request), "Meal skip cleared"));
    }

    @GetMapping("/api/v1/meal-plans/suggestions")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<MealPlanSuggestionResponse>>> getCustomerSuggestions(
            @AuthenticationPrincipal User user,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return ResponseEntity.ok(ApiResponse.success(
                mealPlanService.getCustomerSuggestions(user.getId(), weekStart)));
    }

    @PutMapping("/api/v1/meal-plans/suggestions/{suggestionId}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<MealPlanSuggestionResponse>> cancelReplacementRequest(
            @AuthenticationPrincipal User user,
            @PathVariable UUID suggestionId) {
        return ResponseEntity.ok(ApiResponse.success(
                mealPlanService.cancelReplacementRequest(user.getId(), suggestionId),
                "Suggestion cancelled"));
    }
}
