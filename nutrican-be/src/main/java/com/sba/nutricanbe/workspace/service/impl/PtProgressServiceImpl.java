package com.sba.nutricanbe.workspace.service.impl;

import com.sba.nutricanbe.chat.dto.ChatContextSummaryDto;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.diet.dto.response.DayPlanResponse;
import com.sba.nutricanbe.diet.dto.response.DayTimelineResponse;
import com.sba.nutricanbe.diet.dto.response.DietSummaryResponse;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.DietLogFeedback;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.MealPlanSuggestionStatus;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.repository.DietLogFeedbackRepository;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanRepository;
import com.sba.nutricanbe.diet.repository.MealPlanSuggestionRepository;
import com.sba.nutricanbe.diet.repository.WeeklySummaryRepository;
import com.sba.nutricanbe.diet.service.DayPlanService;
import com.sba.nutricanbe.diet.service.DayTimelineService;
import com.sba.nutricanbe.diet.service.DietLogService;
import com.sba.nutricanbe.user.entity.BodyMetric;
import com.sba.nutricanbe.user.entity.MacroTarget;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.BodyMetricRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.ProgressTimelineService;
import com.sba.nutricanbe.user.service.UserQueryService;
import com.sba.nutricanbe.workspace.dto.MealPlanLateTickItemDto;
import com.sba.nutricanbe.workspace.dto.MealPlanSkipItemDto;
import com.sba.nutricanbe.workspace.dto.MealPlanSuggestionDto;
import com.sba.nutricanbe.workspace.dto.PostMealWeekAggregateDto;
import com.sba.nutricanbe.workspace.dto.ProgressDataDto;
import com.sba.nutricanbe.workspace.dto.WeeklySummaryDto;
import com.sba.nutricanbe.workspace.service.PtProgressService;
import com.sba.nutricanbe.workspace.service.support.MealPlanSuggestionMapper;
import com.sba.nutricanbe.workspace.service.support.PtWorkspaceAccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PtProgressServiceImpl implements PtProgressService {

    private static final BigDecimal DEFAULT_CALORIE_TARGET = BigDecimal.valueOf(2000);

    private final DietLogRepository dietLogRepository;
    private final BodyMetricRepository bodyMetricRepository;
    private final UserRepository userRepository;
    private final UserQueryService userQueryService;
    private final MealPlanRepository mealPlanRepository;
    private final MealPlanItemRepository mealPlanItemRepository;
    private final MealPlanSuggestionRepository mealPlanSuggestionRepository;
    private final WeeklySummaryRepository weeklySummaryRepository;
    private final DietLogFeedbackRepository dietLogFeedbackRepository;
    private final ProgressTimelineService progressTimelineService;
    private final DietLogService dietLogService;
    private final DayPlanService dayPlanService;
    private final DayTimelineService dayTimelineService;
    private final PtWorkspaceAccessGuard accessGuard;
    private final MealPlanSuggestionMapper suggestionMapper;
    private final PtClientMappingRepository mappingRepository;

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<ProgressDataDto> getClientProgress(UUID ptId, UUID clientId, LocalDate startDate, LocalDate endDate) {
        return getClientProgress(ptId, clientId, startDate, endDate, null);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<ProgressDataDto> getClientProgress(
            UUID ptId, UUID clientId, LocalDate startDate, LocalDate endDate, LocalDate mealPlanWeekStart) {
        accessGuard.requirePtClientDataAccess(ptId, clientId);
        if (startDate == null) startDate = DietDates.todayVn().minusMonths(1);
        if (endDate == null) endDate = DietDates.todayVn();

        List<DietLog> logs = dietLogRepository.findByCustomerIdAndLogDateBetween(
                clientId, startDate, endDate, PageRequest.of(0, 1000)).getContent();
        List<BodyMetric> metrics = bodyMetricRepository.findByUserIdAndDateRange(clientId, startDate, endDate);

        MacroTarget macroTarget = userQueryService.findMacroTargetByUserId(clientId).orElse(null);
        BigDecimal calorieTarget = macroTarget != null && macroTarget.getDailyCalories() != null
                ? macroTarget.getDailyCalories() : DEFAULT_CALORIE_TARGET;

        MealPlanProgressContext mealPlanContext = resolveMealPlanProgress(
                ptId, clientId, mealPlanWeekStart, DietDates.todayVn());
        LocalDate summaryWeekStart = mealPlanContext.selectedPlan() != null
                ? mealPlanContext.selectedPlan().getWeekStart()
                : DietDates.todayVn().with(DayOfWeek.MONDAY);
        LocalDate summaryWeekEnd = summaryWeekStart.plusDays(6);
        List<DietLog> summaryLogs = dietLogRepository.findByCustomerIdAndLogDateBetween(
                clientId, summaryWeekStart, summaryWeekEnd, PageRequest.of(0, 1000)).getContent();

        Map<LocalDate, MacroNutrients> historyMacrosByDay = aggregateLoggedMacrosByDay(logs);
        List<ProgressDataDto.DailyCalorieData> calorieData = historyMacrosByDay.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> ProgressDataDto.DailyCalorieData.builder()
                        .date(entry.getKey())
                        .calories(entry.getValue().calories())
                        .target(calorieTarget)
                        .build())
                .toList();

        ProgressDataDto.MealPlanAdherenceSummary mealPlanAdherence = buildMealPlanAdherence(
                mealPlanContext.selectedPlan(), summaryLogs, DietDates.todayVn());
        Map<LocalDate, MacroNutrients> summaryMacrosByDay = aggregateLoggedMacrosByDay(summaryLogs);
        ProgressDataDto.MacroSummary macroSummary = buildMacroSummary(
                summaryMacrosByDay,
                mealPlanAdherence != null ? mealPlanAdherence.getLogCoverageRate() : null,
                mealPlanAdherence != null ? mealPlanAdherence.getAdherenceRate() : null);

        // Chart UI should prefer GET /workspace/clients/{id}/body-metrics (BodyMetricDto).
        // This list stays for progress range helpers; keep shape aligned with BodyMetricDto.
        List<ProgressDataDto.BodyMetricData> metricData = metrics.stream()
                .map(m -> ProgressDataDto.BodyMetricData.builder()
                        .recordDate(m.getRecordDate())
                        .date(m.getRecordDate())
                        .weight(m.getWeight())
                        .bodyFatPercent(m.getBodyFatPercent())
                        .muscleMass(m.getMuscleMass())
                        .lbm(m.getLbm())
                        .build())
                .toList();

        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("User", clientId));

        LocalDateTime coachingStartedAt = findCoachingStartedAt(clientId);

        ProgressDataDto response = ProgressDataDto.builder()
                .clientId(clientId)
                .clientName(client.getFullName())
                .coachingStartedAt(coachingStartedAt)
                .calorieHistory(calorieData)
                .bodyMetrics(metricData)
                .macroSummary(macroSummary)
                .mealPlanWeeks(mealPlanContext.availableWeeks())
                .mealPlanAdherence(mealPlanAdherence)
                .build();

        progressTimelineService.enrichProgress(response, clientId, startDate, endDate);
        enrichMealPlanAndFeedback(
                response, clientId, startDate, endDate, logs, mealPlanContext.selectedPlan());

        return ApiResponse.success(response);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<ChatContextSummaryDto> getChatContext(UUID ptId, UUID clientId) {
        accessGuard.assertActiveMapping(ptId, clientId);
        LocalDate today = DietDates.todayVn();
        var summary = dietLogService.getSummary(clientId, today).getData();
        return ApiResponse.success(ChatContextSummaryDto.builder()
                .date(today)
                .calories(summary != null ? summary.getTotalCalories() : null)
                .protein(summary != null ? summary.getTotalProtein() : null)
                .carbs(summary != null ? summary.getTotalCarbs() : null)
                .fat(summary != null ? summary.getTotalFat() : null)
                .calorieTarget(summary != null ? summary.getTargetCalories() : null)
                .intakeStatus(summary != null && summary.getIntakeStatus() != null
                        ? summary.getIntakeStatus().name() : null)
                .build());
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<DayPlanResponse> getClientDayPlan(UUID ptId, UUID clientId, LocalDate date) {
        accessGuard.requirePtClientDataAccess(ptId, clientId);
        LocalDate planDate = date != null ? date : DietDates.todayVn();
        return ApiResponse.success(dayPlanService.getDayPlan(clientId, planDate));
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<DietSummaryResponse> getClientDietSummary(UUID ptId, UUID clientId, LocalDate date) {
        accessGuard.requirePtClientDataAccess(ptId, clientId);
        LocalDate summaryDate = date != null ? date : DietDates.todayVn();
        return dietLogService.getSummary(clientId, summaryDate);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<DayTimelineResponse> getClientDayTimeline(UUID ptId, UUID clientId, LocalDate date) {
        accessGuard.requirePtClientDataAccess(ptId, clientId);
        LocalDate planDate = date != null ? date : DietDates.todayVn();
        return ApiResponse.success(dayTimelineService.getDayTimeline(clientId, planDate));
    }

    private void enrichMealPlanAndFeedback(ProgressDataDto response, UUID clientId,
                                           LocalDate startDate, LocalDate endDate, List<DietLog> logs,
                                           MealPlan selectedPlan) {
        List<MealPlanSkipItemDto> skips = new ArrayList<>();
        if (selectedPlan != null) {
            mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(selectedPlan.getId())
                    .stream()
                    .filter(i -> i.getSkipReason() != null)
                    .forEach(i -> skips.add(MealPlanSkipItemDto.builder()
                            .itemId(i.getId())
                            .planDate(i.getPlanDate())
                            .mealType(i.getMealType() != null ? i.getMealType().name() : null)
                            .foodLabel(i.getFreeText() != null ? i.getFreeText() : i.getFoodCode())
                            .skipReason(i.getSkipReason().name())
                            .skipNote(i.getSkipNote())
                            .build()));
        }
        response.setSkipReasons(skips);

        // Progress UI no longer shows late ticks / weekly summaries (kept on client list).
        // Leave empty lists so older FE clients don't break on missing keys.
        response.setLateTickReasons(List.of());
        response.setWeeklySummaries(List.of());

        List<MealPlanSuggestionDto> pending = mealPlanSuggestionRepository
                .findByCustomerIdAndStatus(clientId, MealPlanSuggestionStatus.PENDING)
                .stream().map(suggestionMapper::toDto).toList();
        response.setPendingSuggestions(pending);

        if (logs.isEmpty()) {
            response.setPostMealAggregate(List.of());
            return;
        }
        List<UUID> logIds = logs.stream().map(DietLog::getId).toList();
        Map<UUID, DietLogFeedback> feedbackByLog = new HashMap<>();
        dietLogFeedbackRepository.findByDietLogIdIn(logIds).forEach(f -> feedbackByLog.put(f.getDietLogId(), f));
        Map<LocalDate, List<DietLogFeedback>> byWeek = new HashMap<>();
        for (DietLog log : logs) {
            DietLogFeedback fb = feedbackByLog.get(log.getId());
            if (fb == null || fb.getEnergyRating() == null) {
                continue;
            }
            LocalDate weekStart = log.getLogDate().with(DayOfWeek.MONDAY);
            byWeek.computeIfAbsent(weekStart, k -> new ArrayList<>()).add(fb);
        }
        List<PostMealWeekAggregateDto> aggregates = byWeek.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> {
                    List<DietLogFeedback> fbs = e.getValue();
                    double avgE = fbs.stream().mapToInt(DietLogFeedback::getEnergyRating).average().orElse(0);
                    double avgH = fbs.stream()
                            .filter(f -> f.getHungerAfterRating() != null)
                            .mapToInt(DietLogFeedback::getHungerAfterRating)
                            .average().orElse(0);
                    return PostMealWeekAggregateDto.builder()
                            .weekStart(e.getKey())
                            .avgEnergy(BigDecimal.valueOf(avgE).setScale(1, RoundingMode.HALF_UP))
                            .avgHunger(BigDecimal.valueOf(avgH).setScale(1, RoundingMode.HALF_UP))
                            .sampleCount(fbs.size())
                            .build();
                }).toList();
        response.setPostMealAggregate(aggregates);
    }

    private MealPlanProgressContext resolveMealPlanProgress(
            UUID ptId, UUID clientId, LocalDate requestedWeekStart, LocalDate today) {
        Map<LocalDate, MealPlan> newestPlanByWeek = new LinkedHashMap<>();
        mealPlanRepository.findByClientIdAndIsPublishedTrueOrderByWeekStartDesc(clientId).stream()
                .filter(plan -> ptId.equals(plan.getPtId()))
                .forEach(plan -> newestPlanByWeek.putIfAbsent(plan.getWeekStart(), plan));

        List<ProgressDataDto.MealPlanWeekOption> availableWeeks = newestPlanByWeek.values().stream()
                .map(plan -> ProgressDataDto.MealPlanWeekOption.builder()
                        .planId(plan.getId())
                        .weekStart(plan.getWeekStart())
                        .weekEnd(plan.getWeekStart().plusDays(6))
                        .build())
                .toList();

        MealPlan selectedPlan = requestedWeekStart != null
                ? newestPlanByWeek.get(requestedWeekStart)
                : null;
        if (selectedPlan == null) {
            LocalDateTime startedAt = findCoachingStartedAt(clientId);
            LocalDate coachingWeek = com.sba.nutricanbe.common.util.CoachingWeeks.currentWeekStart(startedAt, today);
            if (coachingWeek != null) {
                selectedPlan = newestPlanByWeek.get(coachingWeek);
            }
            if (selectedPlan == null) {
                LocalDate currentWeekStart = today.with(DayOfWeek.MONDAY);
                selectedPlan = newestPlanByWeek.get(currentWeekStart);
            }
        }
        if (selectedPlan == null) {
            selectedPlan = newestPlanByWeek.values().stream()
                    .filter(plan -> !plan.getWeekStart().isAfter(today))
                    .findFirst()
                    .orElseGet(() -> newestPlanByWeek.values().stream().findFirst().orElse(null));
        }
        return new MealPlanProgressContext(selectedPlan, availableWeeks);
    }

    private ProgressDataDto.MealPlanAdherenceSummary buildMealPlanAdherence(
            MealPlan plan, List<DietLog> weekLogs, LocalDate today) {
        if (plan == null) {
            return null;
        }
        List<MealPlanItem> items = mealPlanItemRepository
                .findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId());
        LocalDate weekStart = plan.getWeekStart();
        LocalDate weekEnd = weekStart.plusDays(6);

        List<MealPlanItem> dueItems = items.stream()
                .filter(item -> item.getPlanDate() != null && !item.getPlanDate().isAfter(today))
                .toList();
        int eatenItems = (int) dueItems.stream().filter(item -> Boolean.TRUE.equals(item.getEaten())).count();
        int skippedItems = (int) dueItems.stream().filter(item -> item.getSkipReason() != null).count();
        int pendingItems = Math.max(0, dueItems.size() - eatenItems - skippedItems);

        Set<MealSlot> expectedSlots = new HashSet<>();
        dueItems.stream()
                .filter(item -> item.getMealType() != null)
                .forEach(item -> expectedSlots.add(new MealSlot(item.getPlanDate(), item.getMealType())));
        Set<MealSlot> loggedSlots = new HashSet<>();
        weekLogs.stream()
                .filter(log -> log.getStatus() == DietLogStatus.LOGGED)
                .filter(log -> log.getLogDate() != null && log.getMealType() != null)
                .map(log -> new MealSlot(log.getLogDate(), log.getMealType()))
                .filter(expectedSlots::contains)
                .forEach(loggedSlots::add);

        BigDecimal adherenceRate = percentage(eatenItems, dueItems.size());
        BigDecimal logCoverageRate = percentage(loggedSlots.size(), expectedSlots.size());
        List<ProgressDataDto.DailyMealPlanAdherence> daily = new ArrayList<>();
        for (int offset = 0; offset < 7; offset++) {
            LocalDate date = weekStart.plusDays(offset);
            List<MealPlanItem> dayItems = items.stream()
                    .filter(item -> date.equals(item.getPlanDate()))
                    .toList();
            boolean future = date.isAfter(today);
            int dayDueItems = future ? 0 : dayItems.size();
            int dayEatenItems = future ? 0 : (int) dayItems.stream()
                    .filter(item -> Boolean.TRUE.equals(item.getEaten())).count();
            int daySkippedItems = future ? 0 : (int) dayItems.stream()
                    .filter(item -> item.getSkipReason() != null).count();
            int dayPendingItems = Math.max(0, dayDueItems - dayEatenItems - daySkippedItems);
            daily.add(ProgressDataDto.DailyMealPlanAdherence.builder()
                    .date(date)
                    .totalItems(dayItems.size())
                    .dueItems(dayDueItems)
                    .eatenItems(dayEatenItems)
                    .skippedItems(daySkippedItems)
                    .pendingItems(dayPendingItems)
                    .adherenceRate(percentage(dayEatenItems, dayDueItems))
                    .future(future)
                    .build());
        }

        return ProgressDataDto.MealPlanAdherenceSummary.builder()
                .weekStart(weekStart)
                .weekEnd(weekEnd)
                .totalItems(items.size())
                .dueItems(dueItems.size())
                .eatenItems(eatenItems)
                .skippedItems(skippedItems)
                .pendingItems(pendingItems)
                .expectedMealSlots(expectedSlots.size())
                .loggedMealSlots(loggedSlots.size())
                .adherenceRate(adherenceRate)
                .logCoverageRate(logCoverageRate)
                .daily(daily)
                .build();
    }

    private Map<LocalDate, MacroNutrients> aggregateLoggedMacrosByDay(List<DietLog> logs) {
        Map<LocalDate, MacroNutrients> totals = new HashMap<>();
        logs.stream()
                .filter(log -> log.getStatus() == DietLogStatus.LOGGED)
                .filter(log -> log.getLogDate() != null && log.getMacrosJson() != null)
                .forEach(log -> totals.merge(
                        log.getLogDate(), log.getMacrosJson(), MacroNutrients::add));
        return totals;
    }

    private ProgressDataDto.MacroSummary buildMacroSummary(
            Map<LocalDate, MacroNutrients> macrosByDay,
            BigDecimal logCoverageRate,
            BigDecimal mealPlanAdherenceRate) {
        if (macrosByDay.isEmpty() && logCoverageRate == null && mealPlanAdherenceRate == null) {
            return null;
        }
        MacroNutrients total = macrosByDay.values().stream()
                .reduce(MacroNutrients.ZERO, MacroNutrients::add);
        BigDecimal loggedDays = BigDecimal.valueOf(macrosByDay.size());
        return ProgressDataDto.MacroSummary.builder()
                .avgCalories(average(total.calories(), loggedDays))
                .avgProtein(average(total.protein(), loggedDays))
                .avgCarb(average(total.carbs(), loggedDays))
                .avgFat(average(total.fat(), loggedDays))
                .adherenceRate(logCoverageRate)
                .mealPlanAdherenceRate(mealPlanAdherenceRate)
                .build();
    }

    private BigDecimal average(BigDecimal total, BigDecimal count) {
        return count.signum() == 0
                ? null
                : total.divide(count, 1, RoundingMode.HALF_UP);
    }

    private BigDecimal percentage(long numerator, long denominator) {
        if (denominator <= 0) {
            return null;
        }
        return BigDecimal.valueOf(numerator)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(denominator), 1, RoundingMode.HALF_UP);
    }

    private LocalDateTime findCoachingStartedAt(UUID clientId) {
        return mappingRepository.findByClient_Id(clientId, PageRequest.of(0, 20)).stream()
                .filter(m -> m.getStatus() == ClientMappingStatus.ACTIVE
                        || m.getStatus() == ClientMappingStatus.END_REQUESTED)
                .map(PtClientMapping::getCoachingStartedAt)
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    private record MealPlanProgressContext(
            MealPlan selectedPlan,
            List<ProgressDataDto.MealPlanWeekOption> availableWeeks) {}

    private record MealSlot(LocalDate date, MealType mealType) {}
}
