package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.ai.catalog.ResNetFoodCodeMapping;
import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.diet.dto.response.DayPlanItemResponse;
import com.sba.nutricanbe.diet.dto.response.DayPlanResponse;
import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.entity.SelfPlanItem;
import com.sba.nutricanbe.diet.entity.SelfPlanSubmission;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealPlanItemSourceType;
import com.sba.nutricanbe.diet.enums.SelfPlanSubmissionStatus;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanRepository;
import com.sba.nutricanbe.diet.repository.SelfPlanItemRepository;
import com.sba.nutricanbe.diet.repository.SelfPlanSubmissionRepository;
import com.sba.nutricanbe.diet.service.DayPlanService;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.diet.service.DietLogService;
import com.sba.nutricanbe.diet.service.MealPlanItemMacrosResolver;
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
    private final SelfPlanSubmissionRepository selfPlanSubmissionRepository;
    private final MealPlanRepository mealPlanRepository;
    private final MealPlanItemRepository mealPlanItemRepository;
    private final FoodCatalogService foodCatalogService;
    private final FoodItemRepository foodItemRepository;
    private final DietLogHelper dietLogHelper;
    private final DietLogRepository dietLogRepository;
    private final MealPlanItemMacrosResolver mealPlanItemMacrosResolver;

    @Override
    @Transactional(readOnly = true)
    public DayPlanResponse getDayPlan(UUID customerId, LocalDate date) {
        LocalDate planDate = date != null ? date : DietDates.todayVn();
        List<DayPlanItemResponse> items = new ArrayList<>();

        Optional<MealPlan> ptPlan = findPublishedPlanForDate(customerId, planDate);
        boolean hasPt = ptPlan.isPresent();
        List<DietLog> logs = dietLogRepository.findByCustomerIdAndLogDate(customerId, planDate);
        UUID rejectedSubmissionId = selfPlanSubmissionRepository.findByCustomerIdAndPlanDate(customerId, planDate)
                .stream()
                .filter(s -> s.getStatus() == SelfPlanSubmissionStatus.REJECTED)
                .map(SelfPlanSubmission::getId)
                .findFirst()
                .orElse(null);
        if (hasPt) {
            mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(ptPlan.get().getId()).stream()
                    .filter(i -> planDate.equals(i.getPlanDate()))
                    .forEach(i -> items.add(fromPt(i, logs)));
        }

        selfPlanItemRepository
                .findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(customerId, planDate)
                .stream()
                .filter(i -> !Boolean.TRUE.equals(i.getApplied()))
                .forEach(i -> items.add(fromSelf(i, rejectedSubmissionId)));

        enrichChoiceRejectedFlags(items, planDate, logs);

        items.sort(Comparator
                .comparing(DayPlanItemResponse::getMealType, Comparator.nullsLast(Enum::compareTo))
                .thenComparing(i -> "PT".equals(i.getSource()) ? 0 : 1)
                .thenComparing(i -> Boolean.TRUE.equals(i.getChoiceRejected()) ? 1 : 0)
                .thenComparing(DayPlanItemResponse::getName, Comparator.nullsLast(String::compareToIgnoreCase)));

        BigDecimal totalCal = BigDecimal.ZERO;
        BigDecimal totalPro = BigDecimal.ZERO;
        BigDecimal totalCarb = BigDecimal.ZERO;
        BigDecimal totalFat = BigDecimal.ZERO;
        for (DayPlanItemResponse i : items) {
            if (i.getSkipReason() != null) continue;
            if (Boolean.TRUE.equals(i.getChoiceRejected())) continue;
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

    private DayPlanItemResponse fromSelf(SelfPlanItem item, UUID rejectedSubmissionId) {
        boolean choiceRejected = rejectedSubmissionId != null
                && rejectedSubmissionId.equals(item.getSubmissionId());
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
                .choiceRejected(choiceRejected)
                .build();
    }

    private DayPlanItemResponse fromPt(MealPlanItem item, List<DietLog> logs) {
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
        MacroNutrients macros = mealPlanItemMacrosResolver.resolve(item);
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
                .lateTickReason(item.getLateTickReason())
                .reconcileStatus(resolveReconcileStatus(item, logs))
                .build();
    }

    private String resolveReconcileStatus(MealPlanItem item, List<DietLog> logs) {
        if (item == null || item.getSourceType() != com.sba.nutricanbe.diet.enums.MealPlanItemSourceType.SELF_OVERRIDE) {
            return null;
        }
        if ("ALREADY_LOGGED".equals(item.getNote())) {
            return "ALREADY_LOGGED";
        }
        if (Boolean.TRUE.equals(item.getEaten()) || item.getMealPeriod() == null) {
            return null;
        }
        boolean hasLoggedSlot = logs.stream()
                .filter(log -> log.getStatus() == DietLogStatus.LOGGED)
                .anyMatch(log -> item.getMealPeriod().equals(log.getMealPeriod()));
        return hasLoggedSlot ? "ALREADY_LOGGED" : null;
    }

    /** Buổi đã chốt theo PT gốc → self draft còn lại = không được chọn (giữ lịch sử). */
    private void enrichChoiceRejectedFlags(List<DayPlanItemResponse> items, LocalDate planDate, List<DietLog> logs) {
        for (MealPeriod period : MealPeriod.values()) {
            List<DayPlanItemResponse> inPeriod = items.stream()
                    .filter(i -> period.equals(i.getMealPeriod()))
                    .toList();
            if (inPeriod.isEmpty() || !isPeriodSettled(inPeriod, planDate, period, logs)) {
                continue;
            }
            boolean overrideWinner = inPeriod.stream()
                    .anyMatch(i -> i.getSourceType() == MealPlanItemSourceType.SELF_OVERRIDE
                            && i.getSkipReason() == null);
            if (overrideWinner) {
                continue;
            }
            boolean ptOriginalEaten = inPeriod.stream()
                    .anyMatch(i -> "PT".equals(i.getSource())
                            && i.getSourceType() != MealPlanItemSourceType.SELF_OVERRIDE
                            && i.isEaten()
                            && i.getSkipReason() == null);
            if (!ptOriginalEaten) {
                continue;
            }
            inPeriod.stream()
                    .filter(i -> "SELF".equals(i.getSource()))
                    .filter(i -> !Boolean.TRUE.equals(i.getApplied()))
                    .filter(i -> !i.isEaten())
                    .filter(i -> !Boolean.TRUE.equals(i.getChoiceRejected()))
                    .forEach(i -> i.setChoiceRejected(true));
        }
    }

    private boolean isPeriodSettled(
            List<DayPlanItemResponse> inPeriod, LocalDate planDate, MealPeriod period, List<DietLog> logs) {
        if (logs.stream()
                .filter(l -> l.getStatus() == DietLogStatus.LOGGED)
                .anyMatch(l -> planDate.equals(l.getLogDate()) && period.equals(l.getMealPeriod()))) {
            return true;
        }
        List<DayPlanItemResponse> ptItems = inPeriod.stream()
                .filter(i -> "PT".equals(i.getSource()) || i.getSourceType() == MealPlanItemSourceType.SELF_OVERRIDE)
                .toList();
        if (ptItems.stream().anyMatch(i -> i.isEaten())) {
            return true;
        }
        if (!ptItems.isEmpty() && ptItems.stream().allMatch(i -> i.getSkipReason() != null)) {
            return true;
        }
        return inPeriod.stream()
                .anyMatch(i -> "SELF".equals(i.getSource()) && i.isEaten());
    }
}
