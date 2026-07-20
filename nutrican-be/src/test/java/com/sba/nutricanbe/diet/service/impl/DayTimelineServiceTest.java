package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.diet.dto.response.DayPlanItemResponse;
import com.sba.nutricanbe.diet.dto.response.DayPlanResponse;
import com.sba.nutricanbe.diet.dto.response.DayTimelinePeriodResponse;
import com.sba.nutricanbe.diet.dto.response.DayTimelineReconciliation;
import com.sba.nutricanbe.diet.dto.response.DayTimelineResponse;
import com.sba.nutricanbe.diet.dto.response.DietLogResponse;
import com.sba.nutricanbe.diet.dto.response.DietSummaryResponse;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealPlanItemSourceType;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.repository.SelfPlanItemRepository;
import com.sba.nutricanbe.diet.service.DayPlanService;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.diet.service.DietLogService;
import com.sba.nutricanbe.diet.service.SelfPlanService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DayTimelineServiceTest {

    @Mock private DayPlanService dayPlanService;
    @Mock private DietLogService dietLogService;
    @Mock private DietLogRepository dietLogRepository;
    @Mock private DietLogHelper dietLogHelper;
    @Mock private SelfPlanService selfPlanService;
    @Mock private MealPlanItemRepository mealPlanItemRepository;
    @Mock private SelfPlanItemRepository selfPlanItemRepository;

    @InjectMocks
    private DayTimelineServiceImpl dayTimelineService;

    @Test
    void buildReconciliation_planComplianceOnlyWhenPtTickWithoutLog() {
        DayPlanItemResponse ptItem = DayPlanItemResponse.builder()
                .source("PT")
                .sourceType(MealPlanItemSourceType.PT_ORIGINAL)
                .eaten(true)
                .mealPeriod(MealPeriod.MORNING)
                .build();

        DayTimelineReconciliation r = DayTimelineServiceImpl.buildReconciliation(
                List.of(ptItem), List.of(), true);

        assertTrue(r.isPlanComplianceOnly());
        assertFalse(r.isOffPlanIntake());
        assertFalse(r.isBothLogAndPlan());
        assertNotNull(r.getHintVi());
    }

    @Test
    void buildReconciliation_offPlanWhenLogWithoutPtTick() {
        DietLogResponse log = DietLogResponse.builder()
                .mealPeriod(MealPeriod.MORNING)
                .macrosJson(new MacroNutrients(BigDecimal.TEN, BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ZERO))
                .build();
        DayPlanItemResponse ptItem = DayPlanItemResponse.builder()
                .source("PT")
                .sourceType(MealPlanItemSourceType.PT_ORIGINAL)
                .eaten(false)
                .mealPeriod(MealPeriod.MORNING)
                .build();

        DayTimelineReconciliation r = DayTimelineServiceImpl.buildReconciliation(
                List.of(ptItem), List.of(log), true);

        assertTrue(r.isOffPlanIntake());
        assertFalse(r.isPlanComplianceOnly());
    }

    @Test
    void getDayTimeline_includesLogsWithNotRequiredReview() {
        UUID customerId = UUID.randomUUID();
        LocalDate today = LocalDate.of(2026, 7, 20);

        DayPlanItemResponse ptEvening = DayPlanItemResponse.builder()
                .source("PT")
                .mealPeriod(MealPeriod.EVENING)
                .name("Cá hồi")
                .build();

        DietLogResponse morningLog = DietLogResponse.builder()
                .id(UUID.randomUUID())
                .mealPeriod(MealPeriod.MORNING)
                .status(DietLogStatus.LOGGED)
                .reviewStatus(com.sba.nutricanbe.diet.enums.DietLogReviewStatus.NOT_REQUIRED)
                .macrosJson(new MacroNutrients(BigDecimal.valueOf(32), BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ZERO))
                .build();

        when(dayPlanService.getDayPlan(customerId, today)).thenReturn(DayPlanResponse.builder()
                .date(today)
                .hasPtPlan(true)
                .items(List.of(ptEvening))
                .build());
        when(dietLogService.getSummary(customerId, today)).thenReturn(ApiResponse.success(
                DietSummaryResponse.builder()
                        .date(today)
                        .totalCalories(BigDecimal.valueOf(32))
                        .logs(List.of(morningLog))
                        .build()));
        when(dietLogRepository.findByCustomerIdAndLogDate(customerId, today)).thenReturn(List.of());
        when(dayPlanService.getPublishedPlanForDate(customerId, today)).thenReturn(Optional.empty());
        when(selfPlanItemRepository.findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(customerId, today))
                .thenReturn(List.of());
        when(selfPlanService.listSubmissions(customerId, today, null)).thenReturn(List.of());

        DayTimelineResponse timeline = dayTimelineService.getDayTimeline(customerId, today);

        DayTimelinePeriodResponse morning = timeline.getPeriods().stream()
                .filter(p -> p.getMealPeriod() == MealPeriod.MORNING)
                .findFirst()
                .orElseThrow();
        assertEquals(1, morning.getActualLogs().size());
        assertEquals("Buổi sáng", morning.getLabelVi());
    }

    @Test
    void resolveSettledReason_ptEatenWhenNoLog() {
        LocalDate date = LocalDate.of(2026, 7, 20);
        MealPlanItem ptItem = MealPlanItem.builder()
                .planDate(date)
                .mealPeriod(MealPeriod.AFTERNOON)
                .eaten(true)
                .build();

        String reason = DayTimelineServiceImpl.resolveSettledReason(
                date,
                MealPeriod.AFTERNOON,
                List.of(DayPlanItemResponse.builder().source("PT").eaten(true).build()),
                List.of(),
                List.of(ptItem),
                List.of(),
                List.of());

        assertEquals("PT_EATEN", reason);
    }
}
