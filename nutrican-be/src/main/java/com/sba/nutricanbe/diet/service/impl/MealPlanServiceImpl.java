package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.util.MacroUtils;
import com.sba.nutricanbe.diet.controller.MealPlanController.MealPlanItemRequest;
import com.sba.nutricanbe.diet.controller.MealPlanController.MealPlanRequest;
import com.sba.nutricanbe.diet.dto.MealPlanSaveResult;
import com.sba.nutricanbe.diet.dto.PlanAllergyWarning;
import com.sba.nutricanbe.diet.dto.PlanDietPrefWarning;
import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanRepository;
import com.sba.nutricanbe.diet.service.AllergyCheckService;
import com.sba.nutricanbe.diet.service.DietPrefCheckService;
import com.sba.nutricanbe.diet.service.FoodCatalogService;
import com.sba.nutricanbe.diet.service.MealPlanService;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.user.entity.MacroTarget;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.MacroTargetRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MealPlanServiceImpl implements MealPlanService {

    private final MealPlanRepository mealPlanRepository;
    private final MealPlanItemRepository mealPlanItemRepository;
    private final PtClientMappingRepository mappingRepository;
    private final AllergyCheckService allergyCheckService;
    private final DietPrefCheckService dietPrefCheckService;
    private final FoodCatalogService foodCatalogService;
    private final FoodItemRepository foodItemRepository;
    private final DietLogHelper dietLogHelper;
    private final MacroTargetRepository macroTargetRepository;
    private final WebSocketSessionService webSocketSessionService;

    @Override
    @Transactional
    public MealPlanSaveResult createPlan(UUID ptId, MealPlanRequest request) {
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
        MealPlan plan = mealPlanRepository.findByClientIdOrderByWeekStartDesc(clientId).stream().findFirst()
                .orElseGet(() -> mealPlanRepository.save(MealPlan.builder()
                        .clientId(clientId)
                        .ptId(ptId)
                        .weekStart(request.getWeekStart() != null ? request.getWeekStart() : LocalDate.now())
                        .build()));
        if (request.getNotes() != null) {
            plan.setNotes(request.getNotes());
        }
        if (request.getWeekStart() != null) {
            plan.setWeekStart(request.getWeekStart());
        }
        plan = mealPlanRepository.save(plan);
        mealPlanItemRepository.deleteByMealPlanId(plan.getId());
        return finalizeSave(plan, clientId, request.getItems());
    }

    @Override
    @Transactional
    public List<MealPlanItem> saveItems(UUID mealPlanId, List<MealPlanItemRequest> itemRequests) {
        List<MealPlanItem> saved = new ArrayList<>();
        if (itemRequests == null) {
            return saved;
        }
        for (MealPlanItemRequest item : itemRequests) {
            saved.add(mealPlanItemRepository.save(MealPlanItem.builder()
                    .mealPlanId(mealPlanId)
                    .planDate(item.getPlanDate())
                    .mealType(item.getMealType())
                    .foodCode(item.getFoodCode())
                    .freeText(item.getFreeText())
                    .portionGrams(item.getPortionGrams())
                    .note(item.getNote())
                    .build()));
        }
        return saved;
    }

    @Override
    @Transactional
    public void publishPlan(UUID ptId, UUID planId) {
        MealPlan plan = mealPlanRepository.findById(planId)
                .orElseThrow(() -> new com.sba.nutricanbe.common.exception.ResourceNotFoundException("MealPlan", planId));
        if (!plan.getPtId().equals(ptId)) {
            throw new BadRequestException("You can only publish meal plans that you created.");
        }
        plan.setIsPublished(true);
        mealPlanRepository.save(plan);

        webSocketSessionService.sendToUser(plan.getClientId(), "MEAL_PLAN_PUBLISHED", 
            Map.of("message", "Thực đơn tuần mới của bạn đã sẵn sàng!", "planId", planId.toString()));
    }

    private MealPlanSaveResult finalizeSave(MealPlan plan, UUID clientId, List<MealPlanItemRequest> items) {
        List<String> foodCodes = items != null
                ? items.stream().map(MealPlanItemRequest::getFoodCode).filter(c -> c != null && !c.isBlank()).toList()
                : List.of();
        List<PlanAllergyWarning> allergyWarnings = allergyCheckService.checkPlan(clientId, foodCodes);
        List<PlanDietPrefWarning> dietPrefWarnings = dietPrefCheckService.checkPlan(clientId, foodCodes);
        List<MealPlanItem> savedItems = saveItems(plan.getId(), items);
        String macroWarning = computeMacroWarning(clientId, items);
        return MealPlanSaveResult.builder()
                .plan(plan)
                .items(savedItems)
                .allergyWarnings(allergyWarnings)
                .dietPrefWarnings(dietPrefWarnings)
                .macroWarning(macroWarning)
                .build();
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
            BigDecimal itemCal = resolveItemCalories(item);
            caloriesByDay.merge(item.getPlanDate(), itemCal, MacroUtils::add);
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
        BigDecimal grams = item.getPortionGrams() != null && item.getPortionGrams().compareTo(BigDecimal.ZERO) > 0
                ? item.getPortionGrams() : BigDecimal.valueOf(100);
        return foodCatalogService.findByResNetFoodCode(item.getFoodCode().trim().toLowerCase())
                .flatMap(f -> foodItemRepository.findById(f.getId()))
                .map(food -> dietLogHelper.macrosForFood(food, grams).calories())
                .orElse(BigDecimal.ZERO);
    }

    private void assertActiveClient(UUID ptId, UUID clientId) {
        if (!mappingRepository.existsByPt_IdAndClient_IdAndStatus(ptId, clientId, ClientMappingStatus.ACTIVE)) {
            throw new BadRequestException("Client not active");
        }
    }
}
