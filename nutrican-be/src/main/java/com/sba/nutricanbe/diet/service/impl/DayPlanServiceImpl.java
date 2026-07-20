package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.ai.catalog.ResNetFoodCodeMapping;
import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.diet.dto.response.DayPlanItemResponse;
import com.sba.nutricanbe.diet.dto.response.DayPlanResponse;
import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.entity.SelfPlanItem;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanRepository;
import com.sba.nutricanbe.diet.repository.SelfPlanItemRepository;
import com.sba.nutricanbe.diet.service.DayPlanService;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.diet.service.FoodCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DayPlanServiceImpl implements DayPlanService {

    private final SelfPlanItemRepository selfPlanItemRepository;
    private final MealPlanRepository mealPlanRepository;
    private final MealPlanItemRepository mealPlanItemRepository;
    private final FoodCatalogService foodCatalogService;
    private final FoodItemRepository foodItemRepository;
    private final DietLogHelper dietLogHelper;

    @Override
    @Transactional(readOnly = true)
    public DayPlanResponse getDayPlan(UUID customerId, LocalDate date) {
        LocalDate planDate = date != null ? date : DietDates.todayVn();
        List<DayPlanItemResponse> items = new ArrayList<>();

        Optional<MealPlan> ptPlan = findPublishedPlanForDate(customerId, planDate);
        boolean hasPt = ptPlan.isPresent();
        if (hasPt) {
            mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(ptPlan.get().getId()).stream()
                    .filter(i -> planDate.equals(i.getPlanDate()))
                    .forEach(i -> items.add(fromPt(i)));
        }

        selfPlanItemRepository
                .findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(customerId, planDate)
                .stream()
                .filter(i -> !Boolean.TRUE.equals(i.getApplied()))
                .forEach(i -> items.add(fromSelf(i)));

        items.sort(Comparator
                .comparing(DayPlanItemResponse::getMealType, Comparator.nullsLast(Enum::compareTo))
                .thenComparing(i -> "PT".equals(i.getSource()) ? 0 : 1)
                .thenComparing(DayPlanItemResponse::getName, Comparator.nullsLast(String::compareToIgnoreCase)));

        BigDecimal totalCal = BigDecimal.ZERO;
        BigDecimal totalPro = BigDecimal.ZERO;
        BigDecimal totalCarb = BigDecimal.ZERO;
        BigDecimal totalFat = BigDecimal.ZERO;
        for (DayPlanItemResponse i : items) {
            if (i.getSkipReason() != null) continue;
            if (i.getCalories() != null) totalCal = totalCal.add(i.getCalories());
            if (i.getProtein() != null) totalPro = totalPro.add(i.getProtein());
            if (i.getCarb() != null) totalCarb = totalCarb.add(i.getCarb());
            if (i.getFat() != null) totalFat = totalFat.add(i.getFat());
        }

        return DayPlanResponse.builder()
                .date(planDate)
                .items(items)
                .totalCalories(totalCal)
                .totalProtein(totalPro)
                .totalCarb(totalCarb)
                .totalFat(totalFat)
                .hasPtPlan(hasPt)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<MealPlan> getPublishedPlanForDate(UUID customerId, LocalDate date) {
        return findPublishedPlanForDate(customerId, date);
    }

    private Optional<MealPlan> findPublishedPlanForDate(UUID customerId, LocalDate date) {
        return mealPlanRepository.findByClientIdAndIsPublishedTrueOrderByWeekStartDesc(customerId).stream()
                .filter(p -> {
                    LocalDate start = p.getWeekStart();
                    if (start == null) return false;
                    LocalDate end = start.plusDays(6);
                    return !date.isBefore(start) && !date.isAfter(end);
                })
                .findFirst();
    }

    private DayPlanItemResponse fromSelf(SelfPlanItem item) {
        return DayPlanItemResponse.builder()
                .id(item.getId())
                .source("SELF")
                .locked(false)
                .mealType(item.getMealType())
                .mealPeriod(item.getMealPeriod())
                .name(item.getItemName())
                .quantityG(item.getQuantityG())
                .calories(item.getCalories())
                .protein(item.getProtein())
                .carb(item.getCarb())
                .fat(item.getFat())
                .eaten(Boolean.TRUE.equals(item.getEaten()))
                .foodItemId(item.getFoodItemId())
                .applied(Boolean.TRUE.equals(item.getApplied()))
                .lockedByReview(Boolean.TRUE.equals(item.getLockedByReview()))
                .submissionId(item.getSubmissionId())
                .build();
    }

    private DayPlanItemResponse fromPt(MealPlanItem item) {
        String name = item.getFreeText();
        if (name == null || name.isBlank()) {
            if (item.getFoodCode() != null) {
                name = ResNetFoodCodeMapping.catalogNameViOrDisplay(
                        item.getFoodCode().trim().toLowerCase(), item.getFoodCode());
            } else {
                name = "Món từ PT";
            }
        }
        BigDecimal qty = item.getPortionGrams();
        MacroNutrients macros = resolvePtMacros(item, qty);
        if (macros == null && item.getFoodItemId() != null) {
            macros = foodItemRepository.findById(item.getFoodItemId())
                    .map(f -> dietLogHelper.macrosForFood(f, qty != null ? qty : f.getServingSizeG()))
                    .orElse(null);
        }
        return DayPlanItemResponse.builder()
                .id(item.getId())
                .source("PT")
                .locked(true)
                .mealType(item.getMealType())
                .mealPeriod(item.getMealPeriod())
                .name(name)
                .quantityG(qty)
                .calories(macros != null ? macros.calories() : null)
                .protein(macros != null ? macros.protein() : null)
                .carb(macros != null ? macros.carbs() : null)
                .fat(macros != null ? macros.fat() : null)
                .eaten(Boolean.TRUE.equals(item.getEaten()))
                .skipReason(item.getSkipReason() != null ? item.getSkipReason().name() : null)
                .foodItemId(item.getFoodItemId())
                .sourceType(item.getSourceType() != null
                        ? item.getSourceType() : com.sba.nutricanbe.diet.enums.MealPlanItemSourceType.PT_ORIGINAL)
                .build();
    }

    private MacroNutrients resolvePtMacros(MealPlanItem item, BigDecimal qty) {
        if (item.getFoodCode() == null || item.getFoodCode().isBlank()) {
            return null;
        }
        try {
            return foodCatalogService.findByResNetFoodCode(item.getFoodCode().trim().toLowerCase())
                    .map(r -> {
                        if (r.getId() == null) return null;
                        Optional<FoodItem> food = foodItemRepository.findById(r.getId());
                        return food.map(f -> dietLogHelper.macrosForFood(
                                f, qty != null ? qty : f.getServingSizeG())).orElse(null);
                    })
                    .orElse(null);
        } catch (Exception ignored) {
            return null;
        }
    }
}
