package com.sba.nutricanbe.diet.controller;



import com.sba.nutricanbe.common.dto.ApiResponse;

import com.sba.nutricanbe.diet.dto.MealPlanSaveResult;
import com.sba.nutricanbe.diet.dto.PlanDietPrefWarning;
import com.sba.nutricanbe.diet.entity.MealPlan;

import com.sba.nutricanbe.diet.entity.MealPlanItem;

import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;

import com.sba.nutricanbe.diet.repository.MealPlanRepository;

import com.sba.nutricanbe.diet.service.MealPlanService;
import com.sba.nutricanbe.diet.service.DietPrefCheckService;
import com.sba.nutricanbe.diet.entity.MealPlanSuggestion;
import com.sba.nutricanbe.diet.enums.MealPlanSkipReason;
import com.sba.nutricanbe.diet.enums.MealPlanSuggestionStatus;
import com.sba.nutricanbe.diet.repository.MealPlanSuggestionRepository;
import com.sba.nutricanbe.diet.repository.WeeklySummaryRepository;
import com.sba.nutricanbe.diet.entity.WeeklySummary;
import com.sba.nutricanbe.workspace.dto.WeeklySummaryDto;

import com.sba.nutricanbe.user.entity.User;

import com.sba.nutricanbe.common.exception.BadRequestException;

import com.sba.nutricanbe.common.exception.ResourceNotFoundException;

import lombok.Data;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;

import org.springframework.security.access.prepost.PreAuthorize;

import org.springframework.security.core.annotation.AuthenticationPrincipal;

import org.springframework.web.bind.annotation.*;



import java.time.LocalDate;

import java.util.List;

import java.util.UUID;



@RestController

@RequiredArgsConstructor

public class MealPlanController {



    private final MealPlanRepository mealPlanRepository;

    private final MealPlanItemRepository mealPlanItemRepository;

    private final MealPlanService mealPlanService;

    private final DietPrefCheckService dietPrefCheckService;

    private final MealPlanSuggestionRepository mealPlanSuggestionRepository;

    private final WeeklySummaryRepository weeklySummaryRepository;



    @PostMapping("/api/v1/workspace/meal-plans")

    @PreAuthorize("hasAnyRole('PT_CERTIFIED', 'PT_FREELANCE')")

    public ResponseEntity<ApiResponse<MealPlanSaveResult>> createPlan(

            @AuthenticationPrincipal User pt,

            @RequestBody MealPlanRequest request) {

        if (request.getClientId() == null) {

            throw new BadRequestException("clientId is required");

        }

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

    public ResponseEntity<ApiResponse<MealPlanDetail>> getClientPlan(

            @AuthenticationPrincipal User pt,

            @PathVariable UUID clientId) {

        MealPlan plan = mealPlanRepository.findByClientIdOrderByWeekStartDesc(clientId).stream().findFirst()

                .orElseThrow(() -> new ResourceNotFoundException("MealPlan", clientId));

        List<MealPlanItem> items = mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId());

        return ResponseEntity.ok(ApiResponse.success(buildDetail(plan, clientId, items)));

    }



    @GetMapping("/api/v1/meal-plans/current")

    @PreAuthorize("hasRole('CUSTOMER')")

    public ResponseEntity<ApiResponse<MealPlanDetail>> getCurrentPlan(@AuthenticationPrincipal User user) {

        MealPlan plan = mealPlanRepository.findByClientIdOrderByWeekStartDesc(user.getId()).stream().findFirst()

                .orElseThrow(() -> new ResourceNotFoundException("MealPlan", user.getId()));

        List<MealPlanItem> items = mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId());

        return ResponseEntity.ok(ApiResponse.success(buildDetail(plan, user.getId(), items)));

    }

    @GetMapping("/api/v1/meal-plans/weekly-summaries")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<WeeklySummaryDto>>> getWeeklySummaries(@AuthenticationPrincipal User user) {
        List<WeeklySummaryDto> summaries = weeklySummaryRepository
                .findByClientIdOrderByWeekStartDateDesc(user.getId())
                .stream()
                .limit(8)
                .map(this::toWeeklySummaryDto)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(summaries));
    }

    private WeeklySummaryDto toWeeklySummaryDto(WeeklySummary ws) {
        return WeeklySummaryDto.builder()
                .id(ws.getId())
                .weekStartDate(ws.getWeekStartDate())
                .summaryText(ws.getSummaryText())
                .adherenceRate(ws.getAdherenceRate())
                .nextPlanNote(ws.getNextPlanNote())
                .build();
    }

    private MealPlanDetail buildDetail(MealPlan plan, UUID clientId, List<MealPlanItem> items) {
        List<String> foodCodes = items.stream()
                .map(MealPlanItem::getFoodCode)
                .filter(c -> c != null && !c.isBlank())
                .toList();
        List<PlanDietPrefWarning> warnings = dietPrefCheckService.checkPlan(clientId, foodCodes);
        return new MealPlanDetail(plan, items, warnings);
    }



    @PutMapping("/api/v1/meal-plans/items/{itemId}/eaten")

    @PreAuthorize("hasRole('CUSTOMER')")

    public ResponseEntity<ApiResponse<MealPlanItem>> markEaten(

            @AuthenticationPrincipal User user,

            @PathVariable UUID itemId,

            @RequestParam(defaultValue = "true") boolean eaten) {

        MealPlanItem item = mealPlanItemRepository.findById(itemId)

                .orElseThrow(() -> new ResourceNotFoundException("MealPlanItem", itemId));

        MealPlan plan = mealPlanRepository.findById(item.getMealPlanId())

                .orElseThrow(() -> new ResourceNotFoundException("MealPlan", item.getMealPlanId()));

        if (!plan.getClientId().equals(user.getId())) {

            throw new BadRequestException("Not your meal plan");

        }

        item.setEaten(eaten);

        return ResponseEntity.ok(ApiResponse.success(mealPlanItemRepository.save(item)));

    }

    @PostMapping("/api/v1/meal-plans/items/{itemId}/suggest")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<MealPlanSuggestion>> suggestReplacement(
            @AuthenticationPrincipal User user,
            @PathVariable UUID itemId,
            @RequestBody SuggestRequest request) {
        MealPlanItem item = mealPlanItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("MealPlanItem", itemId));
        MealPlan plan = mealPlanRepository.findById(item.getMealPlanId())
                .orElseThrow(() -> new ResourceNotFoundException("MealPlan", item.getMealPlanId()));
        if (!plan.getClientId().equals(user.getId())) {
            throw new BadRequestException("Not your meal plan");
        }
        MealPlanSuggestion suggestion = mealPlanSuggestionRepository.save(MealPlanSuggestion.builder()
                .mealPlanItemId(itemId)
                .customerId(user.getId())
                .suggestedFoodCode(request.getSuggestedFoodCode())
                .suggestedFoodName(request.getSuggestedFoodName())
                .suggestedGram(request.getSuggestedGram())
                .status(MealPlanSuggestionStatus.PENDING)
                .build());
        return ResponseEntity.ok(ApiResponse.success(suggestion, "Suggestion submitted"));
    }

    @PutMapping("/api/v1/meal-plans/items/{itemId}/skip")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<MealPlanItem>> skipItem(
            @AuthenticationPrincipal User user,
            @PathVariable UUID itemId,
            @RequestBody SkipRequest request) {
        MealPlanItem item = mealPlanItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("MealPlanItem", itemId));
        MealPlan plan = mealPlanRepository.findById(item.getMealPlanId())
                .orElseThrow(() -> new ResourceNotFoundException("MealPlan", item.getMealPlanId()));
        if (!plan.getClientId().equals(user.getId())) {
            throw new BadRequestException("Not your meal plan");
        }
        item.setEaten(false);
        if (request.getSkipReason() != null) {
            item.setSkipReason(MealPlanSkipReason.valueOf(request.getSkipReason()));
        }
        item.setSkipNote(request.getSkipNote());
        return ResponseEntity.ok(ApiResponse.success(mealPlanItemRepository.save(item), "Item skipped"));
    }

    @Data
    public static class SuggestRequest {
        private String suggestedFoodCode;
        private String suggestedFoodName;
        private java.math.BigDecimal suggestedGram;
    }

    @Data
    public static class SkipRequest {
        private String skipReason;
        private String skipNote;
    }



    @Data

    public static class MealPlanRequest {

        private UUID clientId;

        private LocalDate weekStart;

        private String notes;

        private List<MealPlanItemRequest> items;

    }



    @Data

    public static class MealPlanItemRequest {

        private LocalDate planDate;

        private com.sba.nutricanbe.diet.enums.MealType mealType;

        private String foodCode;

        private String freeText;

        private java.math.BigDecimal portionGrams;

        private String note;

    }



    public record MealPlanDetail(MealPlan plan, List<MealPlanItem> items, List<PlanDietPrefWarning> dietPrefWarnings) {}

}


