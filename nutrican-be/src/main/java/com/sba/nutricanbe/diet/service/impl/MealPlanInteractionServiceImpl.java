package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.common.util.MealPeriods;
import com.sba.nutricanbe.diet.dto.request.CreateDietLogRequest;
import com.sba.nutricanbe.diet.dto.request.DietLogItemRequest;
import com.sba.nutricanbe.diet.dto.request.MealPlanMealActionRequest;
import com.sba.nutricanbe.diet.dto.request.MealPlanSkipRequest;
import com.sba.nutricanbe.diet.dto.request.MealPlanSuggestionRequest;
import com.sba.nutricanbe.diet.dto.response.MealPlanDetailResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanItemResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanSuggestionResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanWeeklySummaryResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanWeekResponse;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.entity.MealPlanSuggestion;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealPlanItemSourceType;
import com.sba.nutricanbe.diet.enums.MealPlanReplacementReason;
import com.sba.nutricanbe.diet.enums.MealPlanSkipReason;
import com.sba.nutricanbe.diet.enums.MealPlanSuggestionStatus;
import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanRepository;
import com.sba.nutricanbe.diet.repository.MealPlanSuggestionRepository;
import com.sba.nutricanbe.diet.repository.SelfPlanItemRepository;
import com.sba.nutricanbe.diet.repository.WeeklySummaryRepository;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.diet.service.DietLogService;
import com.sba.nutricanbe.diet.service.MealPlanInteractionService;
import com.sba.nutricanbe.diet.service.MealPlanItemMacrosResolver;
import com.sba.nutricanbe.diet.service.support.MealPlanDetailAssembler;
import com.sba.nutricanbe.user.dto.NotificationPayload;
import com.sba.nutricanbe.user.enums.NotificationLinkType;
import com.sba.nutricanbe.user.service.NotificationService;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MealPlanInteractionServiceImpl implements MealPlanInteractionService {

    private static final BigDecimal DEFAULT_PORTION_GRAMS = BigDecimal.valueOf(100);
    private static final int WEEKLY_SUMMARY_LIMIT = 8;
    private static final int MIN_LATE_TICK_REASON_LENGTH = 10;

    private final MealPlanRepository mealPlanRepository;
    private final MealPlanItemRepository mealPlanItemRepository;
    private final MealPlanSuggestionRepository mealPlanSuggestionRepository;
    private final WeeklySummaryRepository weeklySummaryRepository;
    private final FoodItemRepository foodItemRepository;
    private final DietLogHelper dietLogHelper;
    private final DietLogService dietLogService;
    private final NotificationService notificationService;
    private final WebSocketSessionService webSocketSessionService;
    private final MealPlanItemMacrosResolver mealPlanItemMacrosResolver;
    private final SelfPlanItemRepository selfPlanItemRepository;
    private final MealPlanDetailAssembler mealPlanDetailAssembler;

    @Override
    @Transactional(readOnly = true)
    public MealPlanDetailResponse getCurrentPlan(UUID customerId, LocalDate weekStart) {
        MealPlan plan = (weekStart == null
                ? mealPlanRepository.findByClientIdAndIsPublishedTrueOrderByWeekStartDesc(customerId).stream()
                        .findFirst()
                : mealPlanRepository.findFirstByClientIdAndWeekStartAndIsPublishedTrueOrderByCreatedAtDesc(
                        customerId, weekStart))
                .orElseThrow(() -> new ResourceNotFoundException("MealPlan", customerId));
        return mealPlanDetailAssembler.buildDetail(plan, customerId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MealPlanWeekResponse> getPublishedPlanWeeks(UUID customerId) {
        return mealPlanRepository.findByClientIdAndIsPublishedTrueOrderByWeekStartDesc(customerId).stream()
                .map(MealPlanWeekResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MealPlanWeeklySummaryResponse> getWeeklySummaries(UUID customerId) {
        return weeklySummaryRepository.findByClientIdOrderByWeekStartDateDesc(customerId).stream()
                .limit(WEEKLY_SUMMARY_LIMIT)
                .map(MealPlanWeeklySummaryResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public MealPlanItemResponse markEaten(UUID customerId, UUID itemId, boolean eaten, String lateTickReason) {
        OwnedMealPlanItem owned = requireOwnedPublishedItem(customerId, itemId);
        MealPlanItem item = owned.item();
        if (eaten) {
            if (item.getMealPeriod() == null) {
                throw new BadRequestException("Món plan thiếu khung giờ; sửa/thêm lại món");
            }
            if (!MealPeriods.isMealPeriodOpen(item.getPlanDate(), item.getMealPeriod())
                    && !allowLateTick(item.getPlanDate(), item.getMealPeriod(), lateTickReason)) {
                throw new BadRequestException("Chỉ đánh dấu đã ăn trong khung giờ của buổi đó");
            }
            if (item.getPlanDate().isAfter(DietDates.todayVn())) {
                throw new BadRequestException("Future meal-plan items cannot be marked as eaten");
            }
            if (item.getPlanDate().isBefore(DietDates.todayVn())) {
                throw new BadRequestException("Past meal-plan items can no longer be changed");
            }
        } else {
            assertDateIsActionable(item);
        }
        if (eaten && item.getSkipReason() != null) {
            throw new BadRequestException("Undo the skipped state before marking this item as eaten");
        }
        if (eaten && hasPendingReplacement(itemId)) {
            throw new BadRequestException("Cancel or wait for the pending replacement request first");
        }
        MealPlanItemSourceType sourceType = item.getSourceType() != null
                ? item.getSourceType()
                : MealPlanItemSourceType.PT_ORIGINAL;
        if (eaten && sourceType == MealPlanItemSourceType.PT_ORIGINAL && item.getMealPeriod() != null) {
            assertNoPendingSelfReviewInPeriod(customerId, item.getPlanDate(), item.getMealPeriod());
        }

        if (eaten && sourceType == MealPlanItemSourceType.SELF_OVERRIDE) {
            if (Boolean.TRUE.equals(item.getEaten())) {
                throw new BadRequestException("Món này đã được ghi nhận ăn rồi");
            }
            createDietLogFromOverride(customerId, item, lateTickReason);
        }

        item.setEaten(eaten);
        String normalizedLateTickReason = eaten ? normalizeLateTickReason(lateTickReason) : null;
        item.setLateTickReason(normalizedLateTickReason);
        MealPlanItem saved = mealPlanItemRepository.save(item);
        if (normalizedLateTickReason != null) {
            notificationService.notify(owned.plan().getPtId(), NotificationPayload.builder()
                    .type("MEAL_PLAN_LATE_TICK")
                    .title("Học viên vừa tick trễ một bữa ăn")
                    .body(foodLabel(item) + " · " + normalizedLateTickReason)
                    .linkType(NotificationLinkType.MEAL_PLAN)
                    .linkRefId(owned.plan().getClientId())
                    .sendEmail(false)
                    .build());
        }
        webSocketSessionService.sendToUserOnly(owned.plan().getPtId(), "MEAL_PLAN_PROGRESS_UPDATED",
                Map.of(
                        "clientId", customerId,
                        "planId", owned.plan().getId(),
                        "weekStart", owned.plan().getWeekStart(),
                        "planDate", item.getPlanDate()));
        return MealPlanItemResponse.from(saved, mealPlanItemMacrosResolver.resolve(saved));
    }

    private void createDietLogFromOverride(UUID customerId, MealPlanItem item, String lateTickReason) {
        CreateDietLogRequest logReq = new CreateDietLogRequest();
        logReq.setMealType(item.getMealType());
        logReq.setMealPeriod(item.getMealPeriod());
        logReq.setLogDate(item.getPlanDate());
        logReq.setMealSource(MealSource.HOME_COOKED);
        String name = item.getFreeText() != null && !item.getFreeText().isBlank()
                ? item.getFreeText()
                : (item.getFoodCode() != null ? item.getFoodCode() : "Món plan");
        logReq.setFoodDescription(name);
        logReq.setFoodItemId(item.getFoodItemId());
        logReq.setSendToPt(false);
        logReq.setLateTickReason(normalizeLateTickReason(lateTickReason));

        BigDecimal qty = item.getPortionGrams() != null ? item.getPortionGrams() : DEFAULT_PORTION_GRAMS;
        DietLogItemRequest line = new DietLogItemRequest();
        line.setFoodItemId(item.getFoodItemId());
        line.setItemName(name);
        line.setQuantityG(qty);
        if (item.getFoodItemId() != null) {
            foodItemRepository.findById(item.getFoodItemId()).ifPresent(food -> {
                var macros = dietLogHelper.macrosForFood(food, qty);
                line.setCalories(macros.calories());
                line.setProtein(macros.protein());
                line.setCarb(macros.carbs());
                line.setFat(macros.fat());
            });
        }
        logReq.setItems(List.of(line));
        dietLogService.createLog(customerId, logReq);
    }

    @Override
    @Transactional
    public MealPlanSuggestionResponse suggestReplacement(
            UUID customerId, UUID itemId, MealPlanSuggestionRequest request) {
        OwnedMealPlanItem owned = requireOwnedPublishedItem(customerId, itemId);
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
                || request.getSuggestedGram().compareTo(BigDecimal.ZERO) <= 0) {
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
                .customerId(customerId)
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
                .body(foodLabel(item) + " → " + request.getSuggestedFoodName() + " (" + item.getPlanDate() + ")")
                .linkType(NotificationLinkType.MEAL_PLAN)
                .linkRefId(plan.getClientId())
                .sendEmail(false)
                .build());
        return MealPlanSuggestionResponse.from(suggestion, item);
    }

    @Override
    @Transactional
    public MealPlanItemResponse skipItem(UUID customerId, UUID itemId, MealPlanSkipRequest request) {
        OwnedMealPlanItem owned = requireOwnedPublishedItem(customerId, itemId);
        MealPlanItem item = owned.item();
        MealPlan plan = owned.plan();
        assertDateIsActionable(item);
        if (Boolean.TRUE.equals(item.getEaten())) {
            throw new BadRequestException("An eaten item cannot be skipped");
        }
        if (hasPendingReplacement(itemId)) {
            throw new BadRequestException("Cancel the pending replacement request before skipping this item");
        }
        MealPlanSkipReason skipReason = parseSkipReason(request.getSkipReason(), request.getSkipNote());
        item.setEaten(false);
        item.setSkipReason(skipReason);
        item.setSkipNote(request.getSkipNote());
        if (skipReason == MealPlanSkipReason.ALLERGY) {
            notifyAllergy(plan, foodLabel(item) + " (" + item.getPlanDate() + ")", false);
        }
        MealPlanItem saved = mealPlanItemRepository.save(item);
        return MealPlanItemResponse.from(saved, mealPlanItemMacrosResolver.resolve(saved));
    }

    @Override
    @Transactional
    public MealPlanItemResponse unskipItem(UUID customerId, UUID itemId) {
        MealPlanItem item = requireOwnedPublishedItem(customerId, itemId).item();
        assertDateIsActionable(item);
        item.setSkipReason(null);
        item.setSkipNote(null);
        MealPlanItem saved = mealPlanItemRepository.save(item);
        return MealPlanItemResponse.from(saved, mealPlanItemMacrosResolver.resolve(saved));
    }

    @Override
    @Transactional
    public List<MealPlanItemResponse> skipMeal(
            UUID customerId, UUID planId, MealPlanMealActionRequest request) {
        MealPlan plan = requireOwnedPublishedPlan(customerId, planId);
        List<MealPlanItem> items = resolveMealActionItems(planId, request);
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
            String scope = items.get(0).getMealPeriod() != null
                    ? items.get(0).getMealPeriod().name()
                    : items.get(0).getMealType().name();
            notifyAllergy(plan, request.getPlanDate() + " · " + scope, true);
        }
        return mealPlanItemRepository.saveAll(items).stream().map(MealPlanItemResponse::from).toList();
    }

    @Override
    @Transactional
    public List<MealPlanItemResponse> unskipMeal(
            UUID customerId, UUID planId, MealPlanMealActionRequest request) {
        requireOwnedPublishedPlan(customerId, planId);
        List<MealPlanItem> items = resolveMealActionItems(planId, request);
        if (items.isEmpty()) {
            throw new ResourceNotFoundException("MealPlanMeal", planId);
        }
        items.forEach(item -> {
            assertDateIsActionable(item);
            item.setSkipReason(null);
            item.setSkipNote(null);
        });
        return mealPlanItemRepository.saveAll(items).stream().map(MealPlanItemResponse::from).toList();
    }

    @Override
    @Transactional
    public List<MealPlanSuggestionResponse> getCustomerSuggestions(UUID customerId, LocalDate weekStart) {
        MealPlan plan = mealPlanRepository
                .findFirstByClientIdAndWeekStartAndIsPublishedTrueOrderByCreatedAtDesc(customerId, weekStart)
                .orElseThrow(() -> new ResourceNotFoundException("MealPlan", customerId));
        List<MealPlanItem> items = mealPlanItemRepository
                .findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId());
        if (items.isEmpty()) {
            return List.of();
        }
        Map<UUID, MealPlanItem> itemsById = new HashMap<>();
        items.forEach(item -> itemsById.put(item.getId(), item));
        return mealPlanSuggestionRepository
                .findByCustomerIdAndMealPlanItemIdInOrderByCreatedAtDesc(customerId, List.copyOf(itemsById.keySet()))
                .stream()
                .map(suggestion -> expireIfStale(suggestion, itemsById.get(suggestion.getMealPlanItemId())))
                .map(suggestion -> MealPlanSuggestionResponse.from(
                        suggestion, itemsById.get(suggestion.getMealPlanItemId())))
                .toList();
    }

    @Override
    @Transactional
    public MealPlanSuggestionResponse cancelReplacementRequest(UUID customerId, UUID suggestionId) {
        MealPlanSuggestion suggestion = mealPlanSuggestionRepository.findById(suggestionId)
                .orElseThrow(() -> new ResourceNotFoundException("MealPlanSuggestion", suggestionId));
        if (!customerId.equals(suggestion.getCustomerId())) {
            throw new BadRequestException("Not your replacement request");
        }
        if (suggestion.getStatus() != MealPlanSuggestionStatus.PENDING) {
            throw new BadRequestException("Only a pending request can be cancelled");
        }
        suggestion.setStatus(MealPlanSuggestionStatus.CANCELLED);
        suggestion.setDecidedAt(LocalDateTime.now());
        MealPlanItem item = mealPlanItemRepository.findById(suggestion.getMealPlanItemId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "MealPlanItem", suggestion.getMealPlanItemId()));
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
        return MealPlanSuggestionResponse.from(mealPlanSuggestionRepository.save(suggestion), item);
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

    private MealPeriod parseMealPeriodOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return MealPeriod.valueOf(value.trim().toUpperCase());
        } catch (RuntimeException exception) {
            throw new BadRequestException("Invalid mealPeriod");
        }
    }

    private List<MealPlanItem> resolveMealActionItems(UUID planId, MealPlanMealActionRequest request) {
        MealPeriod period = parseMealPeriodOptional(request.getMealPeriod());
        if (period != null) {
            return mealPlanItemRepository.findByMealPlanIdAndPlanDateAndMealPeriod(
                    planId, request.getPlanDate(), period);
        }
        return mealPlanItemRepository.findByMealPlanIdAndPlanDateAndMealType(
                planId, request.getPlanDate(), parseMealType(request.getMealType()));
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
        if (item.getPlanDate().isBefore(DietDates.todayVn())) {
            throw new BadRequestException("Past meal-plan items can no longer be changed");
        }
    }

    private void assertNoPendingSelfReviewInPeriod(UUID customerId, LocalDate planDate, MealPeriod period) {
        boolean pendingSelf = selfPlanItemRepository
                .findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(customerId, planDate)
                .stream()
                .anyMatch(i -> period.equals(i.getMealPeriod())
                        && Boolean.TRUE.equals(i.getLockedByReview())
                        && !Boolean.TRUE.equals(i.getEaten()));
        if (pendingSelf) {
            throw new BadRequestException(
                    "Buổi này có đề xuất đang chờ PT duyệt. Chờ PT duyệt hoặc hủy đề xuất trước khi tick plan PT.");
        }
    }

    private boolean hasPendingReplacement(UUID itemId) {
        return mealPlanSuggestionRepository.existsByMealPlanItemIdAndStatus(
                itemId, MealPlanSuggestionStatus.PENDING);
    }

    private MealPlanSuggestion expireIfStale(MealPlanSuggestion suggestion, MealPlanItem item) {
        if (suggestion.getStatus() == MealPlanSuggestionStatus.PENDING
                && item != null
                && item.getPlanDate().isBefore(DietDates.todayVn())) {
            suggestion.setStatus(MealPlanSuggestionStatus.EXPIRED);
            suggestion.setDecidedAt(LocalDateTime.now());
            return mealPlanSuggestionRepository.save(suggestion);
        }
        return suggestion;
    }

    private boolean allowLateTick(LocalDate planDate, MealPeriod mealPeriod, String lateTickReason) {
        String normalized = normalizeLateTickReason(lateTickReason);
        if (normalized == null || planDate == null || mealPeriod == null) {
            return false;
        }
        if (!planDate.equals(DietDates.todayVn())) {
            return false;
        }
        return MealPeriods.isPastPeriodForLateTick(mealPeriod);
    }

    private String normalizeLateTickReason(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.length() < MIN_LATE_TICK_REASON_LENGTH) {
            throw new BadRequestException("lateTickReason phải có ít nhất 10 ký tự");
        }
        return trimmed;
    }

    private void notifyAllergy(MealPlan plan, String body, boolean wholeMeal) {
        notificationService.notify(plan.getPtId(), NotificationPayload.builder()
                .type("MEAL_PLAN_ALLERGY_REPORTED")
                .title(wholeMeal ? "Học viên báo dị ứng cả bữa ăn" : "Học viên báo dị ứng món ăn")
                .body(body)
                .linkType(NotificationLinkType.MEAL_PLAN)
                .linkRefId(plan.getClientId())
                .sendEmail(false)
                .build());
    }

    private String foodLabel(MealPlanItem item) {
        return item.getFreeText() != null ? item.getFreeText() : item.getFoodCode();
    }

    private record OwnedMealPlanItem(MealPlan plan, MealPlanItem item) {
    }
}
