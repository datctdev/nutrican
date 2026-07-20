package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.common.util.DayPlanRules;
import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.common.util.DietLogPeriods;
import com.sba.nutricanbe.common.util.MacroUtils;
import com.sba.nutricanbe.common.util.MealPeriodLabels;
import com.sba.nutricanbe.common.util.MealPeriods;
import com.sba.nutricanbe.diet.dto.response.DayPlanItemResponse;
import com.sba.nutricanbe.diet.dto.response.DayPlanResponse;
import com.sba.nutricanbe.diet.dto.response.DayTimelineMacroBreakdown;
import com.sba.nutricanbe.diet.dto.response.DayTimelinePeriodResponse;
import com.sba.nutricanbe.diet.dto.response.DayTimelineReconciliation;
import com.sba.nutricanbe.diet.dto.response.DayTimelineResponse;
import com.sba.nutricanbe.diet.dto.response.DietLogResponse;
import com.sba.nutricanbe.diet.dto.response.DietSummaryResponse;
import com.sba.nutricanbe.diet.dto.response.SelfPlanSubmissionResponse;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.entity.SelfPlanItem;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealPlanItemSourceType;
import com.sba.nutricanbe.diet.enums.SelfPlanSubmissionStatus;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.repository.SelfPlanItemRepository;
import com.sba.nutricanbe.diet.service.DayPlanService;
import com.sba.nutricanbe.diet.service.DayTimelineService;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.diet.service.DietLogService;
import com.sba.nutricanbe.diet.service.SelfPlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DayTimelineServiceImpl implements DayTimelineService {

    private final DayPlanService dayPlanService;
    private final DietLogService dietLogService;
    private final DietLogRepository dietLogRepository;
    private final DietLogHelper dietLogHelper;
    private final SelfPlanService selfPlanService;
    private final MealPlanItemRepository mealPlanItemRepository;
    private final SelfPlanItemRepository selfPlanItemRepository;

    @Override
    @Transactional(readOnly = true)
    public DayTimelineResponse getDayTimeline(UUID customerId, LocalDate date) {
        LocalDate planDate = date != null ? date : DietDates.todayVn();
        LocalDate today = DietDates.todayVn();
        LocalDateTime nowVn = LocalDateTime.now(DietDates.VN);
        MealPeriod currentPeriod = MealPeriods.current(nowVn);

        DayPlanResponse dayPlan = dayPlanService.getDayPlan(customerId, planDate);
        DietSummaryResponse summary = dietLogService.getSummary(customerId, planDate).getData();

        List<DietLog> rawLogs = dietLogRepository.findByCustomerIdAndLogDate(customerId, planDate);
        List<MealPlanItem> ptEntities = loadPtItems(customerId, planDate, dayPlan.isHasPtPlan());
        List<SelfPlanItem> selfEntities = selfPlanItemRepository
                .findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(customerId, planDate);

        List<DietLogResponse> logResponses = summary != null && summary.getLogs() != null
                ? summary.getLogs()
                : rawLogs.stream()
                        .filter(l -> l.getStatus() == DietLogStatus.LOGGED)
                        .map(dietLogHelper::toResponse)
                        .toList();

        Map<MealPeriod, List<DayPlanItemResponse>> planByPeriod = groupPlanItems(dayPlan.getItems());
        Map<MealPeriod, List<DietLogResponse>> logsByPeriod = groupLogs(logResponses);

        List<DayTimelinePeriodResponse> periods = new ArrayList<>();
        for (MealPeriod period : MealPeriod.values()) {
            List<DayPlanItemResponse> planned = planByPeriod.getOrDefault(period, List.of());
            List<DietLogResponse> actual = logsByPeriod.getOrDefault(period, List.of());
            boolean settled = DayPlanRules.isMealPeriodSettled(
                    planDate, period, ptEntities, selfEntities, rawLogs);
            String settledReason = resolveSettledReason(
                    planDate, period, planned, actual, ptEntities, selfEntities, rawLogs);

            periods.add(DayTimelinePeriodResponse.builder()
                    .mealPeriod(period)
                    .labelVi(MealPeriodLabels.labelVi(period))
                    .windowStatus(resolveWindowStatus(planDate, period, today, currentPeriod))
                    .settled(settled)
                    .settledReason(settledReason)
                    .plannedItems(planned)
                    .actualLogs(actual)
                    .plannedTotals(sumPlanMacros(planned))
                    .actualTotals(sumLogMacros(actual))
                    .reconciliation(buildReconciliation(planned, actual, dayPlan.isHasPtPlan()))
                    .build());
        }

        SelfPlanSubmissionResponse submission = pickSubmission(
                selfPlanService.listSubmissions(customerId, planDate, null));

        return DayTimelineResponse.builder()
                .date(planDate)
                .hasPtPlan(dayPlan.isHasPtPlan())
                .targets(buildTargets(summary))
                .fromLogs(buildFromLogs(summary))
                .selfPlanSubmission(submission)
                .periods(periods)
                .build();
    }

    private List<MealPlanItem> loadPtItems(UUID customerId, LocalDate planDate, boolean hasPt) {
        if (!hasPt) {
            return List.of();
        }
        return dayPlanService.getPublishedPlanForDate(customerId, planDate)
                .map(plan -> mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId()).stream()
                        .filter(i -> planDate.equals(i.getPlanDate()))
                        .toList())
                .orElse(List.of());
    }

    private static Map<MealPeriod, List<DayPlanItemResponse>> groupPlanItems(List<DayPlanItemResponse> items) {
        Map<MealPeriod, List<DayPlanItemResponse>> map = new EnumMap<>(MealPeriod.class);
        if (items == null) {
            return map;
        }
        for (DayPlanItemResponse item : items) {
            MealPeriod period = item.getMealPeriod();
            if (period == null) {
                continue;
            }
            map.computeIfAbsent(period, k -> new ArrayList<>()).add(item);
        }
        return map;
    }

    private static Map<MealPeriod, List<DietLogResponse>> groupLogs(List<DietLogResponse> logs) {
        Map<MealPeriod, List<DietLogResponse>> map = new EnumMap<>(MealPeriod.class);
        if (logs == null) {
            return map;
        }
        for (DietLogResponse log : logs) {
            MealPeriod period = DietLogPeriods.resolveLogMealPeriod(log);
            map.computeIfAbsent(period, k -> new ArrayList<>()).add(log);
        }
        return map;
    }

    static String resolveWindowStatus(
            LocalDate planDate, MealPeriod period, LocalDate today, MealPeriod currentPeriod) {
        if (planDate.isAfter(today)) {
            return "future";
        }
        if (planDate.isBefore(today)) {
            return "past";
        }
        if (period == currentPeriod) {
            return "current";
        }
        if (MealPeriods.pastPeriods(currentPeriod, LocalDateTime.now(DietDates.VN)).contains(period)) {
            return "past";
        }
        return "future";
    }

    static String resolveSettledReason(
            LocalDate planDate,
            MealPeriod period,
            List<DayPlanItemResponse> planned,
            List<DietLogResponse> actual,
            List<MealPlanItem> ptEntities,
            List<SelfPlanItem> selfEntities,
            List<DietLog> rawLogs) {
        if (rawLogs.stream()
                .filter(l -> l.getStatus() == DietLogStatus.LOGGED)
                .anyMatch(l -> planDate.equals(l.getLogDate()) && period.equals(l.getMealPeriod()))) {
            return "LOGGED";
        }
        List<MealPlanItem> periodPt = ptEntities.stream()
                .filter(i -> planDate.equals(i.getPlanDate()) && period.equals(i.getMealPeriod()))
                .toList();
        if (!periodPt.isEmpty()) {
            if (periodPt.stream().anyMatch(i -> Boolean.TRUE.equals(i.getEaten()))) {
                return "PT_EATEN";
            }
            if (periodPt.stream().allMatch(i -> i.getSkipReason() != null)) {
                return "ALL_SKIPPED";
            }
        }
        if (selfEntities.stream()
                .anyMatch(i -> planDate.equals(i.getPlanDate())
                        && period.equals(i.getMealPeriod())
                        && Boolean.TRUE.equals(i.getEaten()))) {
            return "SELF_EATEN";
        }
        if (!actual.isEmpty()) {
            return "LOGGED";
        }
        if (planned.stream().anyMatch(i -> "PT".equals(i.getSource()) && i.isEaten())) {
            return "PT_EATEN";
        }
        return null;
    }

    static DayTimelineReconciliation buildReconciliation(
            List<DayPlanItemResponse> planned, List<DietLogResponse> actual, boolean hasPtPlan) {
        boolean hasLogs = actual != null && !actual.isEmpty();
        boolean hasPtEaten = planned != null && planned.stream()
                .anyMatch(i -> "PT".equals(i.getSource())
                        && i.getSkipReason() == null
                        && i.isEaten()
                        && i.getSourceType() != MealPlanItemSourceType.SELF_OVERRIDE);
        boolean hasSelfEaten = planned != null && planned.stream()
                .anyMatch(i -> "SELF".equals(i.getSource()) && i.isEaten());

        boolean both = hasLogs && hasPtEaten;
        boolean planOnly = hasPtEaten && !hasLogs;
        boolean offPlan = hasLogs && !hasPtEaten && !hasSelfEaten && hasPtPlan;

        String hint = null;
        if (both) {
            hint = "Đã ghi nhật ký và tick tuân thủ plan PT";
        } else if (planOnly) {
            hint = "Tick PT — chưa có log chi tiết (ảnh/mô tả)";
        } else if (offPlan) {
            hint = "Đã ghi thực tế — chưa tick món PT trong buổi này";
        }

        return DayTimelineReconciliation.builder()
                .offPlanIntake(offPlan)
                .planComplianceOnly(planOnly)
                .bothLogAndPlan(both)
                .hintVi(hint)
                .build();
    }

    private static DayTimelineMacroBreakdown sumPlanMacros(List<DayPlanItemResponse> items) {
        BigDecimal cal = MacroUtils.ZERO;
        BigDecimal pro = MacroUtils.ZERO;
        BigDecimal carb = MacroUtils.ZERO;
        BigDecimal fat = MacroUtils.ZERO;
        if (items == null) {
            return emptyBreakdown();
        }
        for (DayPlanItemResponse i : items) {
            if (i.getSkipReason() != null || Boolean.TRUE.equals(i.getChoiceRejected())) {
                continue;
            }
            cal = MacroUtils.add(cal, i.getCalories());
            pro = MacroUtils.add(pro, i.getProtein());
            carb = MacroUtils.add(carb, i.getCarb());
            fat = MacroUtils.add(fat, i.getFat());
        }
        return DayTimelineMacroBreakdown.builder()
                .calories(cal).protein(pro).carb(carb).fat(fat).build();
    }

    private static DayTimelineMacroBreakdown sumLogMacros(List<DietLogResponse> logs) {
        BigDecimal cal = MacroUtils.ZERO;
        BigDecimal pro = MacroUtils.ZERO;
        BigDecimal carb = MacroUtils.ZERO;
        BigDecimal fat = MacroUtils.ZERO;
        if (logs == null) {
            return emptyBreakdown();
        }
        for (DietLogResponse log : logs) {
            MacroNutrients m = log.getMacrosJson();
            if (m == null) {
                continue;
            }
            cal = MacroUtils.add(cal, m.calories());
            pro = MacroUtils.add(pro, m.protein());
            carb = MacroUtils.add(carb, m.carbs());
            fat = MacroUtils.add(fat, m.fat());
        }
        return DayTimelineMacroBreakdown.builder()
                .calories(cal).protein(pro).carb(carb).fat(fat).build();
    }

    private static DayTimelineMacroBreakdown buildFromLogs(DietSummaryResponse summary) {
        if (summary == null) {
            return emptyBreakdown();
        }
        return DayTimelineMacroBreakdown.builder()
                .calories(summary.getTotalCalories())
                .protein(summary.getTotalProtein())
                .carb(summary.getTotalCarbs())
                .fat(summary.getTotalFat())
                .build();
    }

    private static DayTimelineMacroBreakdown buildTargets(DietSummaryResponse summary) {
        if (summary == null) {
            return emptyBreakdown();
        }
        return DayTimelineMacroBreakdown.builder()
                .calories(summary.getTargetCalories())
                .protein(summary.getTargetProtein())
                .carb(summary.getTargetCarb())
                .fat(summary.getTargetFat())
                .build();
    }

    private static DayTimelineMacroBreakdown emptyBreakdown() {
        return DayTimelineMacroBreakdown.builder()
                .calories(MacroUtils.ZERO)
                .protein(MacroUtils.ZERO)
                .carb(MacroUtils.ZERO)
                .fat(MacroUtils.ZERO)
                .build();
    }

    private static SelfPlanSubmissionResponse pickSubmission(List<SelfPlanSubmissionResponse> list) {
        if (list == null || list.isEmpty()) {
            return null;
        }
        return list.stream()
                .filter(s -> s.getStatus() == SelfPlanSubmissionStatus.PENDING)
                .findFirst()
                .orElse(list.get(0));
    }
}
