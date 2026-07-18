package com.sba.nutricanbe.workspace.service.impl;

import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanSuggestion;
import com.sba.nutricanbe.diet.enums.MealPlanSuggestionStatus;
import com.sba.nutricanbe.diet.repository.*;
import com.sba.nutricanbe.user.repository.BodyMetricRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.ProgressTimelineService;
import com.sba.nutricanbe.user.service.UserProfileService;
import com.sba.nutricanbe.user.service.UserQueryService;
import com.sba.nutricanbe.user.service.NotificationService;
import com.sba.nutricanbe.diet.service.IntakeControlLoopService;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.workspace.dto.MealPlanSuggestionReviewRequest;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PtWorkspaceMealPlanSuggestionTest {

    @Mock private PtClientMappingRepository mappingRepository;
    @Mock private DietLogRepository dietLogRepository;
    @Mock private BodyMetricRepository bodyMetricRepository;
    @Mock private UserRepository userRepository;
    @Mock private DietLogImageRepository dietLogImageRepository;
    @Mock private SosTicketRepository sosTicketRepository;
    @Mock private UserQueryService userQueryService;
    @Mock private WebSocketSessionService webSocketSessionService;
    @Mock private MealPlanRepository mealPlanRepository;
    @Mock private MealPlanItemRepository mealPlanItemRepository;
    @Mock private MealPlanSuggestionRepository mealPlanSuggestionRepository;
    @Mock private WeeklySummaryRepository weeklySummaryRepository;
    @Mock private DietLogFeedbackRepository dietLogFeedbackRepository;
    @Mock private ProgressTimelineService progressTimelineService;
    @Mock private UserProfileService userProfileService;
    @Mock private IntakeControlLoopService intakeControlLoopService;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private PtWorkspaceServiceImpl ptWorkspaceService;

    @Test
    void reviewMealPlanSuggestion_approveUpdatesItem() {
        UUID ptId = UUID.randomUUID();
        UUID clientId = UUID.randomUUID();
        UUID suggestionId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();

        MealPlanSuggestion suggestion = MealPlanSuggestion.builder()
                .customerId(clientId)
                .mealPlanItemId(itemId)
                .suggestedFoodName("Phở bò")
                .suggestedGram(BigDecimal.valueOf(400))
                .status(MealPlanSuggestionStatus.PENDING)
                .build();
        ReflectionTestUtils.setField(suggestion, "id", suggestionId);

        MealPlanItem item = MealPlanItem.builder()
                .mealPlanId(planId)
                .planDate(LocalDate.now())
                .freeText("Cơm")
                .build();
        ReflectionTestUtils.setField(item, "id", itemId);
        MealPlan plan = MealPlan.builder()
                .clientId(clientId)
                .ptId(ptId)
                .weekStart(LocalDate.now())
                .isPublished(true)
                .build();
        ReflectionTestUtils.setField(plan, "id", planId);

        when(mappingRepository.existsByPt_IdAndClient_IdAndStatus(ptId, clientId, ClientMappingStatus.ACTIVE)).thenReturn(true);
        when(mealPlanSuggestionRepository.findById(suggestionId)).thenReturn(Optional.of(suggestion));
        when(mealPlanItemRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(mealPlanRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(mealPlanSuggestionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MealPlanSuggestionReviewRequest req = new MealPlanSuggestionReviewRequest();
        req.setAction("APPROVE");

        var result = ptWorkspaceService.reviewMealPlanSuggestion(ptId, suggestionId, req);
        assertEquals("APPROVED", result.getData().getStatus());
        verify(mealPlanItemRepository).save(any(MealPlanItem.class));
    }
}
