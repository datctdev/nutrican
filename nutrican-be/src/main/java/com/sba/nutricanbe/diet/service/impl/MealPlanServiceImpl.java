package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.util.MacroUtils;
import com.sba.nutricanbe.diet.dto.request.MealPlanItemRequest;
import com.sba.nutricanbe.diet.dto.request.MealPlanMealActionRequest;
import com.sba.nutricanbe.diet.dto.request.MealPlanRequest;
import com.sba.nutricanbe.diet.dto.request.MealPlanSkipRequest;
import com.sba.nutricanbe.diet.dto.request.MealPlanSuggestionRequest;
import com.sba.nutricanbe.diet.dto.response.MealPlanDetailResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanItemResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanSaveResult;
import com.sba.nutricanbe.diet.dto.response.MealPlanSuggestionResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanWeeklySummaryResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanWeekResponse;
import com.sba.nutricanbe.diet.dto.response.PlanDietPrefWarning;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.entity.MealPlanSuggestion;
import com.sba.nutricanbe.diet.enums.MealPlanReplacementReason;
import com.sba.nutricanbe.diet.enums.MealPlanSkipReason;
import com.sba.nutricanbe.diet.enums.MealPlanSuggestionStatus;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanRepository;
import com.sba.nutricanbe.diet.repository.MealPlanSuggestionRepository;
import com.sba.nutricanbe.diet.repository.WeeklySummaryRepository;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.diet.service.DietPrefCheckService;
import com.sba.nutricanbe.diet.service.FoodCatalogService;
import com.sba.nutricanbe.diet.service.MealPlanService;
import com.sba.nutricanbe.user.dto.NotificationPayload;
import com.sba.nutricanbe.user.entity.MacroTarget;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.NotificationLinkType;
import com.sba.nutricanbe.user.repository.MacroTargetRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.service.NotificationService;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MealPlanServiceImpl implements MealPlanService {

    private final MealPlanRepository mealPlanRepository;
    private final MealPlanItemRepository mealPlanItemRepository;
    private final MealPlanSuggestionRepository mealPlanSuggestionRepository;
    private final WeeklySummaryRepository weeklySummaryRepository;
    private final PtClientMappingRepository mappingRepository;
    private final DietPrefCheckService dietPrefCheckService;
    private final FoodCatalogService foodCatalogService;
    private final FoodItemRepository foodItemRepository;
    private final DietLogHelper dietLogHelper;
    private final MacroTargetRepository macroTargetRepository;
    private final NotificationService notificationService;
    private final WebSocketSessionService webSocketSessionService;

    @Override
    @Transactional
    public MealPlanSaveResult createPlan(UUID ptId, MealPlanRequest request) {
        if (request.getClientId() == null) {
            throw new BadRequestException("clientId is required");
        }
        assertActiveClient(ptId, request.getClientId());
        MealPlan plan = mealPlanRepository.save(MealPlan.builder()
                .clientId(request.getClientId())
                .ptId(ptId)
                .weekStart(request.getWeekStart() != null ? request.getWeekStart() : LocalDate.now())
                .notes(request.getNotes())
                .build());
        return finalizeSave(plan, request.getClientId(), request.getItems());
    }

    @Override
    @Transactional
    public MealPlanSaveResult updatePlan(UUID ptId, UUID clientId, MealPlanRequest request) {
        assertActiveClient(ptId, clientId);
        MealPlan plan = (request.getWeekStart() != null
                ? mealPlanRepository.findFirstByClientIdAndWeekStartOrderByCreatedAtDesc(
                        clientId, request.getWeekStart())
                : mealPlanRepository.findByClientIdOrderByWeekStartDesc(clientId).stream().findFirst())
                .orElseGet(() -> mealPlanRepository.save(MealPlan.builder()
                        .clientId(clientId)
                        .ptId(ptId)
                        .weekStart(request.getWeekStart() != null ? request.getWeekStart() : LocalDate.now())
                        .build()));
        if (!plan.getPtId().equals(ptId)) {
            throw new BadRequestException("You can only update meal plans that you created");
        }
        if (request.getNotes() != null) {
            plan.setNotes(request.getNotes());
        }
        if (request.getWeekStart() != null) {
            plan.setWeekStart(request.getWeekStart());
        }
        plan = mealPlanRepository.save(plan);
        return finalizeUpdate(plan, clientId, request.getItems());
    }

    @Override
    @Transactional(readOnly = true)
    public MealPlanDetailResponse getClientPlan(UUID ptId, UUID clientId, LocalDate weekStart) {
        assertActiveClient(ptId, clientId);
        MealPlan plan = weekStart != null
                ? mealPlanRepository.findFirstByClientIdAndWeekStartOrderByCreatedAtDesc(clientId, weekStart)
                        .orElse(null)
                : mealPlanRepository.findByClientIdOrderByWeekStartDesc(clientId).stream()
                        .findFirst()
                        .orElse(null);
        if (plan == null) {
            return new MealPlanDetailResponse(null, List.of(), List.of());
        }
        if (!plan.getPtId().equals(ptId)) {
            throw new BadRequestException("You can only view meal plans that you created");
        }
        return buildDetail(plan, clientId);
    }

    @Override
    @Transactional(readOnly = true)
    public MealPlanDetailResponse getCurrentPlan(UUID customerId, LocalDate weekStart) {
        MealPlan plan = (weekStart == null
                ? mealPlanRepository.findByClientIdAndIsPublishedTrueOrderByWeekStartDesc(customerId).stream()
                        .findFirst()
                : mealPlanRepository.findFirstByClientIdAndWeekStartAndIsPublishedTrueOrderByCreatedAtDesc(
                        customerId, weekStart))
                .orElseThrow(() -> new ResourceNotFoundException("MealPlan", customerId));
        return buildDetail(plan, customerId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MealPlanWeekResponse> getPublishedPlanWeeks(UUID customerId) {
        return mealPlanRepository.findByClientIdAndIsPublishedTrueOrderByWeekStartDesc(customerId).stream()
                .map(plan -> new MealPlanWeekResponse(
                        plan.getId(), plan.getWeekStart(), plan.getWeekStart().plusDays(6)))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MealPlanWeeklySummaryResponse> getWeeklySummaries(UUID customerId) {
        return weeklySummaryRepository.findByClientIdOrderByWeekStartDateDesc(customerId).stream()
                .limit(8)
                .map(summary -> MealPlanWeeklySummaryResponse.builder()
                        .id(summary.getId())
                        .weekStartDate(summary.getWeekStartDate())
                        .summaryText(summary.getSummaryText())
                        .adherenceRate(summary.getAdherenceRate())
                        .nextPlanNote(summary.getNextPlanNote())
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public void publishPlan(UUID ptId, UUID planId) {
        MealPlan plan = mealPlanRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("MealPlan", planId));
        if (!plan.getPtId().equals(ptId)) {
            throw new BadRequestException("You can only publish meal plans that you created");
        }
        plan.setIsPublished(true);
        mealPlanRepository.save(plan);
        webSocketSessionService.sendToUser(plan.getClientId(), "MEAL_PLAN_PUBLISHED",
                Map.of("message", "Thực đơn tuần mới của bạn đã sẵn sàng!", "planId", planId.toString()));
    }

    @Override
    @Transactional
    public MealPlanItemResponse markEaten(UUID customerId, UUID itemId, boolean eaten) {
        OwnedMealPlanItem owned = requireOwnedPublishedItem(customerId, itemId);
        MealPlanItem item = owned.item();
        assertDateIsActionable(item);
        if (eaten && item.getPlanDate().isAfter(LocalDate.now())) {
            throw new BadRequestException("Future meal-plan items cannot be marked as eaten");
        }
        if (eaten && item.getSkipReason() != null) {
            throw new BadRequestException("Undo the skipped state before marking this item as eaten");
        }
        if (eaten && hasPendingReplacement(itemId)) {
            throw new BadRequestException("Cancel or wait for the pending replacement request first");
        }
        item.setEaten(eaten);
        MealPlanItem saved = mealPlanItemRepository.save(item);
        webSocketSessionService.sendToUserOnly(owned.plan().getPtId(), "MEAL_PLAN_PROGRESS_UPDATED",
                Map.of(
                        "clientId", customerId,
                        "planId", owned.plan().getId(),
                        "weekStart", owned.plan().getWeekStart(),
                        "planDate", item.getPlanDate()));
        return toItemResponse(saved);
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
        return toSuggestionResponse(suggestion, item);
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
        return toItemResponse(mealPlanItemRepository.save(item));
    }

    @Override
    @Transactional
    public MealPlanItemResponse unskipItem(UUID customerId, UUID itemId) {
        MealPlanItem item = requireOwnedPublishedItem(customerId, itemId).item();
        assertDateIsActionable(item);
        item.setSkipReason(null);
        item.setSkipNote(null);
        return toItemResponse(mealPlanItemRepository.save(item));
    }

    @Override
    @Transactional
    public List<MealPlanItemResponse> skipMeal(
            UUID customerId, UUID planId, MealPlanMealActionRequest request) {
        MealPlan plan = requireOwnedPublishedPlan(customerId, planId);
        MealType mealType = parseMealType(request.getMealType());
        List<MealPlanItem> items = mealPlanItemRepository.findByMealPlanIdAndPlanDateAndMealType(
                planId, request.getPlanDate(), mealType);
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
            notifyAllergy(plan, request.getPlanDate() + " · " + mealType.name(), true);
        }
        return mealPlanItemRepository.saveAll(items).stream().map(this::toItemResponse).toList();
    }

    @Override
    @Transactional
    public List<MealPlanItemResponse> unskipMeal(
            UUID customerId, UUID planId, MealPlanMealActionRequest request) {
        requireOwnedPublishedPlan(customerId, planId);
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
        return mealPlanItemRepository.saveAll(items).stream().map(this::toItemResponse).toList();
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
                .map(suggestion -> toSuggestionResponse(
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
        return toSuggestionResponse(mealPlanSuggestionRepository.save(suggestion), item);
    }

    private MealPlanSaveResult finalizeSave(
            MealPlan plan, UUID clientId, List<MealPlanItemRequest> items) {
        List<String> foodCodes = items != null
                ? items.stream()
                        .map(MealPlanItemRequest::getFoodCode)
                        .filter(code -> code != null && !code.isBlank())
                        .toList()
                : List.of();
        List<PlanDietPrefWarning> dietPrefWarnings = dietPrefCheckService.checkPlan(clientId, foodCodes);
        List<MealPlanItem> savedItems = saveItems(plan.getId(), items);
        return MealPlanSaveResult.builder()
                .plan(toPlanResponse(plan))
                .items(savedItems.stream().map(this::toItemResponse).toList())
                .dietPrefWarnings(dietPrefWarnings)
                .macroWarning(computeMacroWarning(clientId, items))
                .build();
    }

    private MealPlanSaveResult finalizeUpdate(
            MealPlan plan, UUID clientId, List<MealPlanItemRequest> items) {
        List<MealPlanItemRequest> requestedItems = items != null ? items : List.of();
        List<String> foodCodes = requestedItems.stream()
                .map(MealPlanItemRequest::getFoodCode)
                .filter(code -> code != null && !code.isBlank())
                .toList();
        List<MealPlanItem> savedItems = syncItems(plan.getId(), requestedItems);
        return MealPlanSaveResult.builder()
                .plan(toPlanResponse(plan))
                .items(savedItems.stream().map(this::toItemResponse).toList())
                .dietPrefWarnings(dietPrefCheckService.checkPlan(clientId, foodCodes))
                .macroWarning(computeMacroWarning(clientId, requestedItems))
                .build();
    }

    private List<MealPlanItem> syncItems(
            UUID mealPlanId, List<MealPlanItemRequest> requestedItems) {
        List<MealPlanItem> existingItems = mealPlanItemRepository
                .findByMealPlanIdOrderByPlanDateAscMealTypeAsc(mealPlanId);
        Map<UUID, MealPlanItem> existingById = new HashMap<>();
        existingItems.forEach(item -> existingById.put(item.getId(), item));
        Set<UUID> retainedIds = new HashSet<>();

        for (MealPlanItemRequest request : requestedItems) {
            if (request.getId() == null) {
                mealPlanItemRepository.save(toNewItem(mealPlanId, request));
                continue;
            }

            MealPlanItem existing = existingById.get(request.getId());
            if (existing == null) {
                throw new BadRequestException("Meal-plan item does not belong to this plan");
            }
            if (!retainedIds.add(existing.getId())) {
                throw new BadRequestException("Duplicate meal-plan item in request");
            }
            if (Boolean.TRUE.equals(existing.getEaten())) {
                if (!hasSameEditableContent(existing, request)) {
                    throw new BadRequestException(
                            "An eaten meal-plan item cannot be changed until the customer unmarks it");
                }
                continue;
            }

            applyEditableContent(existing, request);
            mealPlanItemRepository.save(existing);
        }

        List<MealPlanItem> removedItems = existingItems.stream()
                .filter(item -> !retainedIds.contains(item.getId()))
                .toList();
        if (removedItems.stream().anyMatch(item -> Boolean.TRUE.equals(item.getEaten()))) {
            throw new BadRequestException(
                    "An eaten meal-plan item cannot be deleted until the customer unmarks it");
        }
        if (!removedItems.isEmpty()) {
            mealPlanItemRepository.deleteAll(removedItems);
        }
        return mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(mealPlanId);
    }

    private MealPlanItem toNewItem(UUID mealPlanId, MealPlanItemRequest request) {
        return MealPlanItem.builder()
                .mealPlanId(mealPlanId)
                .planDate(request.getPlanDate())
                .mealType(request.getMealType())
                .foodCode(request.getFoodCode())
                .freeText(request.getFreeText())
                .portionGrams(request.getPortionGrams())
                .note(request.getNote())
                .build();
    }

    private void applyEditableContent(MealPlanItem item, MealPlanItemRequest request) {
        item.setPlanDate(request.getPlanDate());
        item.setMealType(request.getMealType());
        item.setFoodCode(request.getFoodCode());
        item.setFreeText(request.getFreeText());
        item.setPortionGrams(request.getPortionGrams());
        item.setNote(request.getNote());
    }

    private boolean hasSameEditableContent(MealPlanItem item, MealPlanItemRequest request) {
        return Objects.equals(item.getPlanDate(), request.getPlanDate())
                && Objects.equals(item.getMealType(), request.getMealType())
                && sameText(item.getFoodCode(), request.getFoodCode())
                && sameText(item.getFreeText(), request.getFreeText())
                && sameDecimal(item.getPortionGrams(), request.getPortionGrams())
                && sameText(item.getNote(), request.getNote());
    }

    private boolean sameText(String left, String right) {
        String normalizedLeft = left == null || left.isBlank() ? null : left;
        String normalizedRight = right == null || right.isBlank() ? null : right;
        return Objects.equals(normalizedLeft, normalizedRight);
    }

    private boolean sameDecimal(BigDecimal left, BigDecimal right) {
        if (left == null || right == null) {
            return left == null && right == null;
        }
        return left.compareTo(right) == 0;
    }

    private List<MealPlanItem> saveItems(UUID mealPlanId, List<MealPlanItemRequest> itemRequests) {
        List<MealPlanItem> saved = new ArrayList<>();
        if (itemRequests == null) {
            return saved;
        }
        for (MealPlanItemRequest item : itemRequests) {
            saved.add(mealPlanItemRepository.save(toNewItem(mealPlanId, item)));
        }
        return saved;
    }

    String computeMacroWarning(UUID clientId, List<MealPlanItemRequest> items) {
        if (items == null || items.isEmpty()) {
            return null;
        }
        MacroTarget target = macroTargetRepository.findByUserId(clientId).orElse(null);
        BigDecimal dailyTarget = target != null && target.getDailyCalories() != null
                ? target.getDailyCalories() : BigDecimal.valueOf(2000);
        BigDecimal threshold = dailyTarget.multiply(BigDecimal.valueOf(1.1));
        Map<LocalDate, BigDecimal> caloriesByDay = new HashMap<>();
        for (MealPlanItemRequest item : items) {
            if (item.getPlanDate() == null) {
                continue;
            }
            caloriesByDay.merge(item.getPlanDate(), resolveItemCalories(item), MacroUtils::add);
        }
        for (BigDecimal dayTotal : caloriesByDay.values()) {
            if (dayTotal.compareTo(threshold) > 0) {
                return "Một hoặc nhiều ngày vượt 110% macro target (" + threshold.intValue() + " kcal)";
            }
        }
        return null;
    }

    private BigDecimal resolveItemCalories(MealPlanItemRequest item) {
        if (item.getFoodCode() == null || item.getFoodCode().isBlank()) {
            return BigDecimal.ZERO;
        }
        BigDecimal grams = item.getPortionGrams() != null
                && item.getPortionGrams().compareTo(BigDecimal.ZERO) > 0
                ? item.getPortionGrams() : BigDecimal.valueOf(100);
        return foodCatalogService.findByResNetFoodCode(item.getFoodCode().trim().toLowerCase())
                .flatMap(food -> foodItemRepository.findById(food.getId()))
                .map(food -> dietLogHelper.macrosForFood(food, grams).calories())
                .orElse(BigDecimal.ZERO);
    }

    private MealPlanDetailResponse buildDetail(MealPlan plan, UUID clientId) {
        List<MealPlanItem> items = mealPlanItemRepository
                .findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId());
        List<String> foodCodes = items.stream()
                .map(MealPlanItem::getFoodCode)
                .filter(code -> code != null && !code.isBlank())
                .toList();
        return new MealPlanDetailResponse(
                toPlanResponse(plan),
                items.stream().map(this::toItemResponse).toList(),
                dietPrefCheckService.checkPlan(clientId, foodCodes));
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

    private void assertActiveClient(UUID ptId, UUID clientId) {
        if (!mappingRepository.existsByPt_IdAndClient_IdAndStatus(
                ptId, clientId, ClientMappingStatus.ACTIVE)) {
            throw new BadRequestException("Client not active");
        }
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

    private MealPlanSuggestion expireIfStale(MealPlanSuggestion suggestion, MealPlanItem item) {
        if (suggestion.getStatus() == MealPlanSuggestionStatus.PENDING
                && item != null
                && item.getPlanDate().isBefore(LocalDate.now())) {
            suggestion.setStatus(MealPlanSuggestionStatus.EXPIRED);
            suggestion.setDecidedAt(LocalDateTime.now());
            return mealPlanSuggestionRepository.save(suggestion);
        }
        return suggestion;
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

    private MealPlanResponse toPlanResponse(MealPlan plan) {
        return MealPlanResponse.builder()
                .id(plan.getId())
                .createdAt(plan.getCreatedAt())
                .updatedAt(plan.getUpdatedAt())
                .clientId(plan.getClientId())
                .ptId(plan.getPtId())
                .weekStart(plan.getWeekStart())
                .notes(plan.getNotes())
                .isPublished(plan.getIsPublished())
                .build();
    }

    private MealPlanItemResponse toItemResponse(MealPlanItem item) {
        return MealPlanItemResponse.builder()
                .id(item.getId())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .mealPlanId(item.getMealPlanId())
                .planDate(item.getPlanDate())
                .mealType(item.getMealType())
                .foodCode(item.getFoodCode())
                .freeText(item.getFreeText())
                .portionGrams(item.getPortionGrams())
                .note(item.getNote())
                .eaten(item.getEaten())
                .skipReason(item.getSkipReason())
                .skipNote(item.getSkipNote())
                .build();
    }

    private MealPlanSuggestionResponse toSuggestionResponse(
            MealPlanSuggestion suggestion, MealPlanItem item) {
        return MealPlanSuggestionResponse.builder()
                .id(suggestion.getId())
                .mealPlanItemId(suggestion.getMealPlanItemId())
                .customerId(suggestion.getCustomerId())
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
                .updatedAt(suggestion.getUpdatedAt())
                .decidedAt(suggestion.getDecidedAt())
                .build();
    }

    private record OwnedMealPlanItem(MealPlan plan, MealPlanItem item) {
    }
}
