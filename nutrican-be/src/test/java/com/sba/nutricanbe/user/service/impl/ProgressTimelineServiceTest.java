package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.user.dto.ClientGoalDto;
import com.sba.nutricanbe.user.entity.ClientGoal;
import com.sba.nutricanbe.user.enums.NutritionGoal;
import com.sba.nutricanbe.user.repository.ClientGoalMilestoneRepository;
import com.sba.nutricanbe.user.repository.ClientGoalRepository;
import com.sba.nutricanbe.user.repository.BodyMetricRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.user.service.ClientGoalService;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
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

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProgressTimelineServiceTest {

    @Mock private ClientGoalRepository clientGoalRepository;
    @Mock private ClientGoalMilestoneRepository milestoneRepository;
    @Mock private BodyMetricRepository bodyMetricRepository;
    @Mock private DietLogRepository dietLogRepository;
    @Mock private ClientGoalService clientGoalService;
    @Mock private PtClientMappingRepository mappingRepository;
    @Mock private WebSocketSessionService webSocketSessionService;

    @InjectMocks
    private ProgressTimelineServiceImpl service;

    @Test
    void detectRegression_whenWeightLossGoalAndTwoIncreases() {
        UUID userId = UUID.randomUUID();
        when(clientGoalRepository.findByUserId(userId)).thenReturn(Optional.of(ClientGoal.builder()
                .userId(userId)
                .nutritionGoal(NutritionGoal.WEIGHT_LOSS)
                .build()));
        when(bodyMetricRepository.findByUserIdAndDateRange(userId, LocalDate.now().minusWeeks(4), LocalDate.now()))
                .thenReturn(List.of(
                        com.sba.nutricanbe.user.entity.BodyMetric.builder()
                                .recordDate(LocalDate.now().minusDays(3))
                                .weight(BigDecimal.valueOf(70))
                                .build(),
                        com.sba.nutricanbe.user.entity.BodyMetric.builder()
                                .recordDate(LocalDate.now().minusDays(2))
                                .weight(BigDecimal.valueOf(71))
                                .build(),
                        com.sba.nutricanbe.user.entity.BodyMetric.builder()
                                .recordDate(LocalDate.now().minusDays(1))
                                .weight(BigDecimal.valueOf(72))
                                .build()
                ));

        var alert = service.detectRegression(userId);
        assertTrue(alert.isActive());
    }

    @Test
    void detectRegression_requiresAtLeastHalfKgPerStep() {
        UUID userId = UUID.randomUUID();
        when(clientGoalRepository.findByUserId(userId)).thenReturn(Optional.of(ClientGoal.builder()
                .userId(userId)
                .nutritionGoal(NutritionGoal.WEIGHT_LOSS)
                .build()));
        when(bodyMetricRepository.findByUserIdAndDateRange(userId, LocalDate.now().minusWeeks(4), LocalDate.now()))
                .thenReturn(List.of(
                        com.sba.nutricanbe.user.entity.BodyMetric.builder()
                                .recordDate(LocalDate.now().minusDays(3))
                                .weight(BigDecimal.valueOf(70))
                                .build(),
                        com.sba.nutricanbe.user.entity.BodyMetric.builder()
                                .recordDate(LocalDate.now().minusDays(2))
                                .weight(BigDecimal.valueOf(70.3))
                                .build(),
                        com.sba.nutricanbe.user.entity.BodyMetric.builder()
                                .recordDate(LocalDate.now().minusDays(1))
                                .weight(BigDecimal.valueOf(70.6))
                                .build()
                ));

        var alert = service.detectRegression(userId);
        assertTrue(!alert.isActive());
    }

    @Test
    void projectedCompletion_withTwoWeightPoints() {
        UUID userId = UUID.randomUUID();
        ClientGoalDto goals = ClientGoalDto.builder()
                .targetWeight(java.math.BigDecimal.valueOf(65))
                .baselineWeight(java.math.BigDecimal.valueOf(75))
                .targetDate(LocalDate.now().plusMonths(3))
                .build();
        when(bodyMetricRepository.findByUserIdAndDateRange(userId, LocalDate.now().minusMonths(3), LocalDate.now()))
                .thenReturn(List.of(
                        com.sba.nutricanbe.user.entity.BodyMetric.builder()
                                .recordDate(LocalDate.now().minusDays(14))
                                .weight(java.math.BigDecimal.valueOf(74))
                                .build(),
                        com.sba.nutricanbe.user.entity.BodyMetric.builder()
                                .recordDate(LocalDate.now().minusDays(7))
                                .weight(java.math.BigDecimal.valueOf(73))
                                .build()
                ));

        LocalDate projected = service.computeProjectedCompletion(userId, goals);
        assertNotNull(projected);
    }

    @Test
    void projectedCompletion_nullWithoutGoals() {
        assertNull(service.computeProjectedCompletion(UUID.randomUUID(), null));
    }
}
