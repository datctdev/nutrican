package com.sba.nutricanbe.workspace.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.exception.UnauthorizedException;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanRepository;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.repository.BodyMetricRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.UserQueryService;
import com.sba.nutricanbe.diet.repository.DietLogFeedbackRepository;
import com.sba.nutricanbe.diet.repository.MealPlanSuggestionRepository;
import com.sba.nutricanbe.diet.repository.WeeklySummaryRepository;
import com.sba.nutricanbe.diet.enums.MealPlanSuggestionStatus;
import com.sba.nutricanbe.user.service.ProgressTimelineService;
import com.sba.nutricanbe.workspace.dto.ProgressDataDto;
import com.sba.nutricanbe.workspace.service.support.MealPlanSuggestionMapper;
import com.sba.nutricanbe.workspace.service.support.PtWorkspaceAccessGuard;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import org.springframework.data.domain.PageImpl;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProgressAdherenceTest {

    @Mock private DietLogRepository dietLogRepository;
    @Mock private BodyMetricRepository bodyMetricRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserQueryService userQueryService;
    @Mock private MealPlanRepository mealPlanRepository;
    @Mock private MealPlanItemRepository mealPlanItemRepository;
    @Mock private ProgressTimelineService progressTimelineService;
    @Mock private MealPlanSuggestionRepository mealPlanSuggestionRepository;
    @Mock private WeeklySummaryRepository weeklySummaryRepository;
    @Mock private DietLogFeedbackRepository dietLogFeedbackRepository;
    @Mock private PtWorkspaceAccessGuard accessGuard;
    @Mock private MealPlanSuggestionMapper suggestionMapper;

    @InjectMocks
    private PtProgressServiceImpl ptWorkspaceService;

    @Test
    void mealPlanAdherence_isEatenOverTotal() {
        UUID ptId = UUID.randomUUID();
        UUID clientId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();

        LocalDate start = LocalDate.now().minusDays(30);
        LocalDate end = LocalDate.now();

        when(dietLogRepository.findByCustomerIdAndLogDateBetween(
                eq(clientId), any(LocalDate.class), any(LocalDate.class), any()))
                .thenReturn(new PageImpl<>(List.of()));
        when(bodyMetricRepository.findByUserIdAndDateRange(clientId, start, end)).thenReturn(List.of());
        when(userQueryService.findMacroTargetByUserId(clientId)).thenReturn(Optional.empty());
        LocalDate weekStart = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        MealPlan plan = MealPlan.builder()
                .clientId(clientId)
                .ptId(ptId)
                .weekStart(weekStart)
                .isPublished(true)
                .build();
        ReflectionTestUtils.setField(plan, "id", planId);
        when(mealPlanRepository.findByClientIdAndIsPublishedTrueOrderByWeekStartDesc(clientId))
                .thenReturn(List.of(plan));
        when(mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(planId))
                .thenReturn(List.of(
                        MealPlanItem.builder().planDate(weekStart).eaten(true).build(),
                        MealPlanItem.builder().planDate(weekStart).eaten(false).build(),
                        MealPlanItem.builder().planDate(weekStart).eaten(true).build(),
                        MealPlanItem.builder().planDate(weekStart).eaten(false).build()
                ));
        User client = User.builder().fullName("Test Client").build();
        ReflectionTestUtils.setField(client, "id", clientId);
        when(userRepository.findById(clientId)).thenReturn(Optional.of(client));
        when(mealPlanSuggestionRepository.findByCustomerIdAndStatus(clientId, MealPlanSuggestionStatus.PENDING))
                .thenReturn(List.of());
        when(weeklySummaryRepository.findByClientIdOrderByWeekStartDateDesc(clientId)).thenReturn(List.of());

        ApiResponse<ProgressDataDto> result = ptWorkspaceService.getClientProgress(
                ptId, clientId, start, end);

        BigDecimal adherence = result.getData().getMacroSummary().getMealPlanAdherenceRate();
        assertEquals(0, BigDecimal.valueOf(50.0).compareTo(adherence));
    }

    @Test
    void getClientProgress_inactiveMapping_throws403() {
        UUID ptId = UUID.randomUUID();
        UUID clientId = UUID.randomUUID();
        doThrow(new UnauthorizedException("No access to this client data"))
                .when(accessGuard).requirePtClientDataAccess(ptId, clientId);

        assertThrows(UnauthorizedException.class, () -> ptWorkspaceService.getClientProgress(
                ptId, clientId, LocalDate.now().minusDays(7), LocalDate.now()));
    }
}
