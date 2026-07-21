package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.common.util.MacroUtils;
import com.sba.nutricanbe.common.util.MealPeriods;
import com.sba.nutricanbe.diet.dto.request.MealPlanItemRequest;
import com.sba.nutricanbe.diet.dto.request.MealPlanRequest;
import com.sba.nutricanbe.diet.dto.response.MealPlanDetailResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanItemResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanSaveResult;
import com.sba.nutricanbe.diet.dto.response.PlanDietPrefWarning;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanRepository;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.diet.service.DietPrefCheckService;
import com.sba.nutricanbe.diet.service.FoodCatalogService;
import com.sba.nutricanbe.diet.service.MealPlanAuthoringService;
import com.sba.nutricanbe.diet.service.support.MealPlanDetailAssembler;
import com.sba.nutricanbe.user.entity.MacroTarget;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.MacroTargetRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
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
public class MealPlanAuthoringServiceImpl implements MealPlanAuthoringService {

    private static final BigDecimal DEFAULT_DAILY_CALORIES = BigDecimal.valueOf(2000);
    private static final BigDecimal MACRO_WARNING_MULTIPLIER = BigDecimal.valueOf(1.1);
    private static final BigDecimal DEFAULT_PORTION_GRAMS = BigDecimal.valueOf(100);

    private final MealPlanRepository mealPlanRepository;
    private final MealPlanItemRepository mealPlanItemRepository;
    private final PtClientMappingRepository mappingRepository;
    private final DietPrefCheckService dietPrefCheckService;
    private final FoodCatalogService foodCatalogService;
    private final FoodItemRepository foodItemRepository;
    private final DietLogHelper dietLogHelper;
    private final MacroTargetRepository macroTargetRepository;
    private final WebSocketSessionService webSocketSessionService;
    private final MealPlanDetailAssembler mealPlanDetailAssembler;

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
                .weekStart(request.getWeekStart() != null ? request.getWeekStart() : DietDates.todayVn())
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
                        .weekStart(request.getWeekStart() != null ? request.getWeekStart() : DietDates.todayVn())
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
        return mealPlanDetailAssembler.buildDetail(plan, clientId);
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
                .plan(MealPlanResponse.from(plan))
                .items(savedItems.stream().map(MealPlanItemResponse::from).toList())
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
                .plan(MealPlanResponse.from(plan))
                .items(savedItems.stream().map(MealPlanItemResponse::from).toList())
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
        MealPeriod period = resolveMealPeriod(request.getMealPeriod(), request.getMealType());
        MealType mealType = period != null ? MealPeriods.toMealType(period) : request.getMealType();
        return MealPlanItem.builder()
                .mealPlanId(mealPlanId)
                .planDate(request.getPlanDate())
                .mealType(mealType)
                .mealPeriod(period)
                .foodCode(request.getFoodCode())
                .freeText(request.getFreeText())
                .portionGrams(request.getPortionGrams())
                .note(request.getNote())
                .build();
    }

    private void applyEditableContent(MealPlanItem item, MealPlanItemRequest request) {
        MealPeriod period = resolveMealPeriod(request.getMealPeriod(), request.getMealType());
        MealType mealType = period != null ? MealPeriods.toMealType(period) : request.getMealType();
        item.setPlanDate(request.getPlanDate());
        item.setMealType(mealType);
        item.setMealPeriod(period);
        item.setFoodCode(request.getFoodCode());
        item.setFreeText(request.getFreeText());
        item.setPortionGrams(request.getPortionGrams());
        item.setNote(request.getNote());
    }

    private MealPeriod resolveMealPeriod(MealPeriod requested, MealType mealType) {
        if (requested != null) return requested;
        return MealPeriods.deriveFromMealType(mealType);
    }

    private boolean hasSameEditableContent(MealPlanItem item, MealPlanItemRequest request) {
        MealPeriod period = resolveMealPeriod(request.getMealPeriod(), request.getMealType());
        return Objects.equals(item.getPlanDate(), request.getPlanDate())
                && Objects.equals(item.getMealType(),
                    period != null ? MealPeriods.toMealType(period) : request.getMealType())
                && Objects.equals(item.getMealPeriod(), period)
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
                ? target.getDailyCalories() : DEFAULT_DAILY_CALORIES;
        BigDecimal threshold = dailyTarget.multiply(MACRO_WARNING_MULTIPLIER);
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
                ? item.getPortionGrams() : DEFAULT_PORTION_GRAMS;
        return foodCatalogService.findByResNetFoodCode(item.getFoodCode().trim().toLowerCase())
                .flatMap(food -> foodItemRepository.findById(food.getId()))
                .map(food -> dietLogHelper.macrosForFood(food, grams).calories())
                .orElse(BigDecimal.ZERO);
    }

    private void assertActiveClient(UUID ptId, UUID clientId) {
        if (!mappingRepository.existsByPt_IdAndClient_IdAndStatus(
                ptId, clientId, ClientMappingStatus.ACTIVE)) {
            throw new BadRequestException("Client not active");
        }
    }
}
