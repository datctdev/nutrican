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
import com.sba.nutricanbe.diet.enums.MealPlanReplacementReason;
import com.sba.nutricanbe.diet.enums.MealPlanSuggestionStatus;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.repository.MealPlanSuggestionRepository;
import com.sba.nutricanbe.diet.repository.WeeklySummaryRepository;
import com.sba.nutricanbe.diet.entity.WeeklySummary;
import com.sba.nutricanbe.workspace.dto.WeeklySummaryDto;
import com.sba.nutricanbe.workspace.dto.MealPlanSuggestionDto;

import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.dto.NotificationPayload;
import com.sba.nutricanbe.user.enums.NotificationLinkType;
import com.sba.nutricanbe.user.service.NotificationService;

import com.sba.nutricanbe.common.exception.BadRequestException;

import com.sba.nutricanbe.common.exception.ResourceNotFoundException;

import lombok.Data;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;

import org.springframework.security.access.prepost.PreAuthorize;

import org.springframework.security.core.annotation.AuthenticationPrincipal;

import org.springframework.web.bind.annotation.*;



import java.time.LocalDate;
import java.time.LocalDateTime;

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

    private final NotificationService notificationService;



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
            @PathVariable UUID clientId,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate weekStart) {

        MealPlan plan;
        if (weekStart != null) {
            plan = mealPlanRepository.findFirstByClientIdAndWeekStartOrderByCreatedAtDesc(clientId, weekStart).orElse(null);
        } else {
            plan = mealPlanRepository.findByClientIdOrderByWeekStartDesc(clientId).stream().findFirst().orElse(null);
        }

        if (plan == null) {
            return ResponseEntity.ok(ApiResponse.success(new MealPlanDetail(null, List.of(), List.of())));
        }

        List<MealPlanItem> items = mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId());
        return ResponseEntity.ok(ApiResponse.success(buildDetail(plan, clientId, items)));
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

    public ResponseEntity<ApiResponse<MealPlanDetail>> getCurrentPlan(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false)
            @org.springframework.format.annotation.DateTimeFormat(
                    iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate weekStart) {

        MealPlan plan = (weekStart == null
                ? mealPlanRepository.findByClientIdAndIsPublishedTrueOrderByWeekStartDesc(user.getId())
                        .stream().findFirst()
                : mealPlanRepository.findFirstByClientIdAndWeekStartAndIsPublishedTrueOrderByCreatedAtDesc(
                        user.getId(), weekStart))

                .orElseThrow(() -> new ResourceNotFoundException("MealPlan", user.getId()));

        List<MealPlanItem> items = mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId());

        return ResponseEntity.ok(ApiResponse.success(buildDetail(plan, user.getId(), items)));

    }

    @GetMapping("/api/v1/meal-plans/weeks")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<MealPlanWeekOption>>> getPublishedPlanWeeks(
            @AuthenticationPrincipal User user) {
        List<MealPlanWeekOption> weeks = mealPlanRepository
                .findByClientIdAndIsPublishedTrueOrderByWeekStartDesc(user.getId())
                .stream()
                .map(plan -> new MealPlanWeekOption(
                        plan.getId(),
                        plan.getWeekStart(),
                        plan.getWeekStart().plusDays(6)))
                .toList();
        return ResponseEntity.ok(ApiResponse.success(weeks));
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

        OwnedMealPlanItem owned = requireOwnedPublishedItem(user.getId(), itemId);
        MealPlanItem item = owned.item();
        assertDateIsActionable(item);
        if (eaten && item.getSkipReason() != null) {
            throw new BadRequestException("Undo the skipped state before marking this item as eaten");
        }
        if (eaten && hasPendingReplacement(itemId)) {
            throw new BadRequestException("Cancel or wait for the pending replacement request first");
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
        OwnedMealPlanItem owned = requireOwnedPublishedItem(user.getId(), itemId);
        MealPlanItem item = owned.item();
        MealPlan plan = owned.plan();
        assertDateIsActionable(item);
        if (Boolean.TRUE.equals(item.getEaten())) {
            throw new BadRequestException("An eaten item cannot be replaced");
        }
        if (item.getSkipReason() != null) {
            throw new BadRequestException("Undo the skipped state before requesting a replacement");
        }
        if (hasPendingReplacement(itemId)) {
            throw new BadRequestException("This item already has a pending replacement request");
        }
        if ((request.getSuggestedFoodCode() == null || request.getSuggestedFoodCode().isBlank())
                && (request.getSuggestedFoodName() == null || request.getSuggestedFoodName().isBlank())) {
            throw new BadRequestException("A replacement food is required");
        }
        if (request.getSuggestedGram() == null
                || request.getSuggestedGram().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("suggestedGram must be positive");
        }
        MealPlanReplacementReason reason;
        try {
            reason = MealPlanReplacementReason.valueOf(request.getReason());
        } catch (RuntimeException exception) {
            throw new BadRequestException("A valid replacement reason is required");
        }
        if (reason == MealPlanReplacementReason.OTHER
                && (request.getCustomerNote() == null || request.getCustomerNote().isBlank())) {
            throw new BadRequestException("A note is required for OTHER reason");
        }
        MealPlanSuggestion suggestion = mealPlanSuggestionRepository.save(MealPlanSuggestion.builder()
                .mealPlanItemId(itemId)
                .customerId(user.getId())
                .suggestedFoodCode(request.getSuggestedFoodCode())
                .suggestedFoodName(request.getSuggestedFoodName())
                .suggestedGram(request.getSuggestedGram())
                .originalFoodCode(item.getFoodCode())
                .originalFoodName(item.getFreeText())
                .originalGram(item.getPortionGrams())
                .requestReason(reason.name())
                .customerNote(request.getCustomerNote())
                .status(MealPlanSuggestionStatus.PENDING)
                .build());
        notificationService.notify(plan.getPtId(), NotificationPayload.builder()
                .type("MEAL_PLAN_REPLACEMENT_REQUESTED")
                .title("Học viên yêu cầu thay món")
                .body((item.getFreeText() != null ? item.getFreeText() : item.getFoodCode())
                        + " → " + request.getSuggestedFoodName() + " (" + item.getPlanDate() + ")")
                .linkType(NotificationLinkType.MEAL_PLAN)
                .linkRefId(plan.getClientId())
                .sendEmail(false)
                .build());
        return ResponseEntity.ok(ApiResponse.success(suggestion, "Suggestion submitted"));
    }

    @PutMapping("/api/v1/meal-plans/items/{itemId}/skip")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<MealPlanItem>> skipItem(
            @AuthenticationPrincipal User user,
            @PathVariable UUID itemId,
            @RequestBody SkipRequest request) {
        OwnedMealPlanItem owned = requireOwnedPublishedItem(user.getId(), itemId);
        MealPlanItem item = owned.item();
        MealPlan plan = owned.plan();
        assertDateIsActionable(item);
        if (Boolean.TRUE.equals(item.getEaten())) {
            throw new BadRequestException("An eaten item cannot be skipped");
        }
        if (hasPendingReplacement(itemId)) {
            throw new BadRequestException("Cancel the pending replacement request before skipping this item");
        }
        if (request.getSkipReason() == null || request.getSkipReason().isBlank()) {
            throw new BadRequestException("skipReason is required");
        }
        MealPlanSkipReason skipReason;
        try {
            skipReason = MealPlanSkipReason.valueOf(request.getSkipReason());
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Invalid skipReason");
        }
        if (skipReason == MealPlanSkipReason.OTHER
                && (request.getSkipNote() == null || request.getSkipNote().isBlank())) {
            throw new BadRequestException("A note is required for OTHER reason");
        }
        item.setEaten(false);
        item.setSkipReason(skipReason);
        item.setSkipNote(request.getSkipNote());
        if (skipReason == MealPlanSkipReason.ALLERGY) {
            notificationService.notify(plan.getPtId(), NotificationPayload.builder()
                    .type("MEAL_PLAN_ALLERGY_REPORTED")
                    .title("Học viên báo dị ứng món ăn")
                    .body((item.getFreeText() != null ? item.getFreeText() : item.getFoodCode())
                            + " (" + item.getPlanDate() + ")")
                    .linkType(NotificationLinkType.MEAL_PLAN)
                    .linkRefId(plan.getClientId())
                    .sendEmail(false)
                    .build());
        }
        return ResponseEntity.ok(ApiResponse.success(mealPlanItemRepository.save(item), "Item skipped"));
    }

    @PutMapping("/api/v1/meal-plans/items/{itemId}/unskip")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<MealPlanItem>> unskipItem(
            @AuthenticationPrincipal User user,
            @PathVariable UUID itemId) {
        MealPlanItem item = requireOwnedPublishedItem(user.getId(), itemId).item();
        assertDateIsActionable(item);
        item.setSkipReason(null);
        item.setSkipNote(null);
        return ResponseEntity.ok(ApiResponse.success(mealPlanItemRepository.save(item), "Skipped state cleared"));
    }

    @PutMapping("/api/v1/meal-plans/{planId}/meals/skip")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<MealPlanItem>>> skipMeal(
            @AuthenticationPrincipal User user,
            @PathVariable UUID planId,
            @RequestBody MealActionRequest request) {
        MealPlan plan = requireOwnedPublishedPlan(user.getId(), planId);
        MealType mealType = parseMealType(request.getMealType());
        List<MealPlanItem> items = mealPlanItemRepository
                .findByMealPlanIdAndPlanDateAndMealType(planId, request.getPlanDate(), mealType);
        if (items.isEmpty()) {
            throw new ResourceNotFoundException("MealPlanMeal", planId);
        }
        MealPlanSkipReason reason = parseSkipReason(request.getSkipReason(), request.getSkipNote());
        for (MealPlanItem item : items) {
            assertDateIsActionable(item);
            if (Boolean.TRUE.equals(item.getEaten())) {
                throw new BadRequestException("An eaten meal cannot be skipped");
            }
            if (hasPendingReplacement(item.getId())) {
                throw new BadRequestException("Cancel pending replacement requests before skipping the meal");
            }
        }
        items.forEach(item -> {
            item.setEaten(false);
            item.setSkipReason(reason);
            item.setSkipNote(request.getSkipNote());
        });
        if (reason == MealPlanSkipReason.ALLERGY) {
            notificationService.notify(plan.getPtId(), NotificationPayload.builder()
                    .type("MEAL_PLAN_ALLERGY_REPORTED")
                    .title("Học viên báo dị ứng cả bữa ăn")
                    .body(request.getPlanDate() + " · " + mealType.name())
                    .linkType(NotificationLinkType.MEAL_PLAN)
                    .linkRefId(plan.getClientId())
                    .sendEmail(false)
                    .build());
        }
        return ResponseEntity.ok(ApiResponse.success(mealPlanItemRepository.saveAll(items), "Meal skipped"));
    }

    @PutMapping("/api/v1/meal-plans/{planId}/meals/unskip")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<MealPlanItem>>> unskipMeal(
            @AuthenticationPrincipal User user,
            @PathVariable UUID planId,
            @RequestBody MealActionRequest request) {
        requireOwnedPublishedPlan(user.getId(), planId);
        List<MealPlanItem> items = mealPlanItemRepository.findByMealPlanIdAndPlanDateAndMealType(
                planId, request.getPlanDate(), parseMealType(request.getMealType()));
        if (items.isEmpty()) {
            throw new ResourceNotFoundException("MealPlanMeal", planId);
        }
        items.forEach(item -> {
            assertDateIsActionable(item);
            item.setSkipReason(null);
            item.setSkipNote(null);
        });
        return ResponseEntity.ok(ApiResponse.success(mealPlanItemRepository.saveAll(items), "Meal skip cleared"));
    }

    @GetMapping("/api/v1/meal-plans/suggestions")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<MealPlanSuggestionDto>>> getCustomerSuggestions(
            @AuthenticationPrincipal User user,
            @RequestParam
            @org.springframework.format.annotation.DateTimeFormat(
                    iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        MealPlan plan = mealPlanRepository
                .findFirstByClientIdAndWeekStartAndIsPublishedTrueOrderByCreatedAtDesc(user.getId(), weekStart)
                .orElseThrow(() -> new ResourceNotFoundException("MealPlan", user.getId()));
        List<MealPlanItem> items = mealPlanItemRepository
                .findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId());
        List<UUID> itemIds = items.stream().map(MealPlanItem::getId).toList();
        if (itemIds.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }
        List<MealPlanSuggestionDto> suggestions = mealPlanSuggestionRepository
                .findByCustomerIdAndMealPlanItemIdInOrderByCreatedAtDesc(user.getId(), itemIds)
                .stream()
                .map(this::expireIfStale)
                .map(this::toSuggestionDto)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(suggestions));
    }

    @PutMapping("/api/v1/meal-plans/suggestions/{suggestionId}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<MealPlanSuggestionDto>> cancelReplacementRequest(
            @AuthenticationPrincipal User user,
            @PathVariable UUID suggestionId) {
        MealPlanSuggestion suggestion = mealPlanSuggestionRepository.findById(suggestionId)
                .orElseThrow(() -> new ResourceNotFoundException("MealPlanSuggestion", suggestionId));
        if (!user.getId().equals(suggestion.getCustomerId())) {
            throw new BadRequestException("Not your replacement request");
        }
        if (suggestion.getStatus() != MealPlanSuggestionStatus.PENDING) {
            throw new BadRequestException("Only a pending request can be cancelled");
        }
        suggestion.setStatus(MealPlanSuggestionStatus.CANCELLED);
        suggestion.setDecidedAt(LocalDateTime.now());
        MealPlanItem item = mealPlanItemRepository.findById(suggestion.getMealPlanItemId())
                .orElseThrow(() -> new ResourceNotFoundException("MealPlanItem", suggestion.getMealPlanItemId()));
        MealPlan plan = mealPlanRepository.findById(item.getMealPlanId())
                .orElseThrow(() -> new ResourceNotFoundException("MealPlan", item.getMealPlanId()));
        notificationService.notify(plan.getPtId(), NotificationPayload.builder()
                .type("MEAL_PLAN_REPLACEMENT_CANCELLED")
                .title("Học viên đã hủy yêu cầu thay món")
                .body(suggestion.getOriginalFoodName() != null
                        ? suggestion.getOriginalFoodName() : suggestion.getOriginalFoodCode())
                .linkType(NotificationLinkType.MEAL_PLAN)
                .linkRefId(plan.getClientId())
                .sendEmail(false)
                .build());
        return ResponseEntity.ok(ApiResponse.success(
                toSuggestionDto(mealPlanSuggestionRepository.save(suggestion)), "Suggestion cancelled"));
    }

    private OwnedMealPlanItem requireOwnedPublishedItem(UUID customerId, UUID itemId) {
        MealPlanItem item = mealPlanItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("MealPlanItem", itemId));
        MealPlan plan = mealPlanRepository.findById(item.getMealPlanId())
                .orElseThrow(() -> new ResourceNotFoundException("MealPlan", item.getMealPlanId()));
        if (!plan.getClientId().equals(customerId) || !Boolean.TRUE.equals(plan.getIsPublished())) {
            throw new BadRequestException("Not your published meal plan");
        }
        return new OwnedMealPlanItem(plan, item);
    }

    private MealPlan requireOwnedPublishedPlan(UUID customerId, UUID planId) {
        MealPlan plan = mealPlanRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("MealPlan", planId));
        if (!plan.getClientId().equals(customerId) || !Boolean.TRUE.equals(plan.getIsPublished())) {
            throw new BadRequestException("Not your published meal plan");
        }
        return plan;
    }

    private MealType parseMealType(String value) {
        try {
            return MealType.valueOf(value);
        } catch (RuntimeException exception) {
            throw new BadRequestException("Invalid mealType");
        }
    }

    private MealPlanSkipReason parseSkipReason(String value, String note) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException("skipReason is required");
        }
        MealPlanSkipReason reason;
        try {
            reason = MealPlanSkipReason.valueOf(value);
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Invalid skipReason");
        }
        if (reason == MealPlanSkipReason.OTHER && (note == null || note.isBlank())) {
            throw new BadRequestException("A note is required for OTHER reason");
        }
        return reason;
    }

    private void assertDateIsActionable(MealPlanItem item) {
        if (item.getPlanDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Past meal-plan items can no longer be changed");
        }
    }

    private boolean hasPendingReplacement(UUID itemId) {
        return mealPlanSuggestionRepository.existsByMealPlanItemIdAndStatus(
                itemId, MealPlanSuggestionStatus.PENDING);
    }

    private MealPlanSuggestion expireIfStale(MealPlanSuggestion suggestion) {
        if (suggestion.getStatus() != MealPlanSuggestionStatus.PENDING) {
            return suggestion;
        }
        MealPlanItem item = mealPlanItemRepository.findById(suggestion.getMealPlanItemId()).orElse(null);
        if (item != null && item.getPlanDate().isBefore(LocalDate.now())) {
            suggestion.setStatus(MealPlanSuggestionStatus.EXPIRED);
            suggestion.setDecidedAt(LocalDateTime.now());
            return mealPlanSuggestionRepository.save(suggestion);
        }
        return suggestion;
    }

    private MealPlanSuggestionDto toSuggestionDto(MealPlanSuggestion suggestion) {
        MealPlanItem item = mealPlanItemRepository.findById(suggestion.getMealPlanItemId()).orElse(null);
        return MealPlanSuggestionDto.builder()
                .id(suggestion.getId())
                .mealPlanItemId(suggestion.getMealPlanItemId())
                .originalFoodCode(suggestion.getOriginalFoodCode())
                .originalFoodName(suggestion.getOriginalFoodName())
                .originalGram(suggestion.getOriginalGram())
                .suggestedFoodCode(suggestion.getSuggestedFoodCode())
                .suggestedFoodName(suggestion.getSuggestedFoodName())
                .suggestedGram(suggestion.getSuggestedGram())
                .requestReason(suggestion.getRequestReason())
                .customerNote(suggestion.getCustomerNote())
                .ptNote(suggestion.getPtNote())
                .planDate(item != null ? item.getPlanDate() : null)
                .mealType(item != null && item.getMealType() != null ? item.getMealType().name() : null)
                .status(suggestion.getStatus() != null ? suggestion.getStatus().name() : null)
                .createdAt(suggestion.getCreatedAt())
                .decidedAt(suggestion.getDecidedAt())
                .build();
    }

    private record OwnedMealPlanItem(MealPlan plan, MealPlanItem item) {}

    @Data
    public static class SuggestRequest {
        private String suggestedFoodCode;
        private String suggestedFoodName;
        private java.math.BigDecimal suggestedGram;
        private String reason;
        private String customerNote;
    }

    @Data
    public static class SkipRequest {
        private String skipReason;
        private String skipNote;
    }

    @Data
    public static class MealActionRequest {
        private LocalDate planDate;
        private String mealType;
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

    public record MealPlanWeekOption(UUID planId, LocalDate weekStart, LocalDate weekEnd) {}

}


