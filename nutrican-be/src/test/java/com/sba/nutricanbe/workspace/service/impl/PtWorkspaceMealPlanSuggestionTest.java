package com.sba.nutricanbe.workspace.service.impl;

import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanSuggestion;
import com.sba.nutricanbe.diet.entity.SelfPlanItem;
import com.sba.nutricanbe.diet.entity.SelfPlanSubmission;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealPlanItemSourceType;
import com.sba.nutricanbe.diet.enums.MealPlanSuggestionStatus;
import com.sba.nutricanbe.diet.enums.SelfPlanSubmissionStatus;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanRepository;
import com.sba.nutricanbe.diet.repository.MealPlanSuggestionRepository;
import com.sba.nutricanbe.diet.repository.SelfPlanItemRepository;
import com.sba.nutricanbe.diet.repository.SelfPlanSubmissionRepository;
import com.sba.nutricanbe.diet.repository.WeeklySummaryRepository;
import com.sba.nutricanbe.user.service.NotificationService;
import com.sba.nutricanbe.workspace.dto.MealPlanSuggestionDto;
import com.sba.nutricanbe.workspace.dto.MealPlanSuggestionReviewRequest;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import com.sba.nutricanbe.workspace.service.support.MealPlanSuggestionMapper;
import com.sba.nutricanbe.workspace.service.support.PtWorkspaceAccessGuard;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PtWorkspaceMealPlanSuggestionTest {

    @Mock private MealPlanSuggestionRepository mealPlanSuggestionRepository;
    @Mock private MealPlanItemRepository mealPlanItemRepository;
    @Mock private MealPlanRepository mealPlanRepository;
    @Mock private DietLogRepository dietLogRepository;
    @Mock private SelfPlanItemRepository selfPlanItemRepository;
    @Mock private SelfPlanSubmissionRepository selfPlanSubmissionRepository;
    @Mock private WeeklySummaryRepository weeklySummaryRepository;
    @Mock private NotificationService notificationService;
    @Mock private WebSocketSessionService webSocketSessionService;
    @Mock private PtWorkspaceAccessGuard accessGuard;
    @Mock private MealPlanSuggestionMapper suggestionMapper;

    @InjectMocks
    private PtReviewServiceImpl ptWorkspaceService;

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

        when(mealPlanSuggestionRepository.findById(suggestionId)).thenReturn(Optional.of(suggestion));
        when(mealPlanItemRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(mealPlanRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(mealPlanSuggestionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(suggestionMapper.toDto(any())).thenAnswer(inv -> {
            MealPlanSuggestion s = inv.getArgument(0);
            return MealPlanSuggestionDto.builder()
                    .status(s.getStatus() != null ? s.getStatus().name() : null)
                    .build();
        });

        MealPlanSuggestionReviewRequest req = new MealPlanSuggestionReviewRequest();
        req.setAction("APPROVE");

        var result = ptWorkspaceService.reviewMealPlanSuggestion(ptId, suggestionId, req);
        assertEquals("APPROVED", result.getData().getStatus());
        verify(mealPlanItemRepository).save(any(MealPlanItem.class));
    }

    @Test
    void listPendingSelfPlanSubmissions_hidesEatenItemsAndEmptySubmissions() {
        UUID ptId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID submission1Id = UUID.randomUUID();
        UUID submission2Id = UUID.randomUUID();

        SelfPlanSubmission submission1 = SelfPlanSubmission.builder()
                .customerId(customerId)
                .ptId(ptId)
                .planDate(LocalDate.now())
                .status(SelfPlanSubmissionStatus.PENDING)
                .build();
        ReflectionTestUtils.setField(submission1, "id", submission1Id);
        SelfPlanSubmission submission2 = SelfPlanSubmission.builder()
                .customerId(customerId)
                .ptId(ptId)
                .planDate(LocalDate.now().plusDays(1))
                .status(SelfPlanSubmissionStatus.PENDING)
                .build();
        ReflectionTestUtils.setField(submission2, "id", submission2Id);

        SelfPlanItem eatenItem = SelfPlanItem.builder()
                .customerId(customerId)
                .planDate(LocalDate.now())
                .mealType(com.sba.nutricanbe.diet.enums.MealType.SNACK)
                .itemName("Đã ăn")
                .eaten(true)
                .submissionId(submission1Id)
                .build();
        SelfPlanItem pendingItem = SelfPlanItem.builder()
                .customerId(customerId)
                .planDate(LocalDate.now())
                .mealType(com.sba.nutricanbe.diet.enums.MealType.DINNER)
                .itemName("Còn chờ PT")
                .eaten(false)
                .submissionId(submission1Id)
                .build();
        SelfPlanItem onlyEatenItem = SelfPlanItem.builder()
                .customerId(customerId)
                .planDate(LocalDate.now().plusDays(1))
                .mealType(com.sba.nutricanbe.diet.enums.MealType.LUNCH)
                .itemName("Ẩn khỏi PT")
                .eaten(true)
                .submissionId(submission2Id)
                .build();

        when(selfPlanSubmissionRepository.findByPtIdAndStatusOrderBySubmittedAtDesc(ptId, SelfPlanSubmissionStatus.PENDING))
                .thenReturn(List.of(submission1, submission2));
        when(selfPlanItemRepository.findBySubmissionId(submission1Id))
                .thenReturn(List.of(eatenItem, pendingItem));
        when(selfPlanItemRepository.findBySubmissionId(submission2Id))
                .thenReturn(List.of(onlyEatenItem));

        var result = ptWorkspaceService.listPendingSelfPlanSubmissions(ptId);

        assertEquals(1, result.getData().size());
        assertEquals(1, result.getData().get(0).getItems().size());
        assertEquals("Còn chờ PT", result.getData().get(0).getItems().get(0).getItemName());
    }

    @Test
    void listPendingSelfPlanSubmissions_hidesSettledPeriodItems() {
        UUID ptId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID submissionId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();
        LocalDate today = LocalDate.now();

        SelfPlanSubmission submission = SelfPlanSubmission.builder()
                .customerId(customerId)
                .ptId(ptId)
                .planDate(today)
                .status(SelfPlanSubmissionStatus.PENDING)
                .build();
        ReflectionTestUtils.setField(submission, "id", submissionId);

        SelfPlanItem afternoonSelf = SelfPlanItem.builder()
                .customerId(customerId)
                .planDate(today)
                .mealPeriod(MealPeriod.AFTERNOON)
                .mealType(com.sba.nutricanbe.diet.enums.MealType.SNACK)
                .itemName("Self chiều")
                .eaten(false)
                .lockedByReview(false)
                .submissionId(submissionId)
                .build();
        SelfPlanItem eveningSelf = SelfPlanItem.builder()
                .customerId(customerId)
                .planDate(today)
                .mealPeriod(MealPeriod.EVENING)
                .mealType(com.sba.nutricanbe.diet.enums.MealType.DINNER)
                .itemName("Self tối")
                .eaten(false)
                .lockedByReview(true)
                .submissionId(submissionId)
                .build();

        MealPlan plan = MealPlan.builder()
                .clientId(customerId)
                .ptId(ptId)
                .weekStart(today.with(java.time.DayOfWeek.MONDAY))
                .isPublished(true)
                .build();
        ReflectionTestUtils.setField(plan, "id", planId);
        MealPlanItem ptAfternoonEaten = MealPlanItem.builder()
                .mealPlanId(planId)
                .planDate(today)
                .mealPeriod(MealPeriod.AFTERNOON)
                .mealType(com.sba.nutricanbe.diet.enums.MealType.SNACK)
                .eaten(true)
                .sourceType(MealPlanItemSourceType.PT_ORIGINAL)
                .build();

        when(selfPlanSubmissionRepository.findByPtIdAndStatusOrderBySubmittedAtDesc(ptId, SelfPlanSubmissionStatus.PENDING))
                .thenReturn(List.of(submission));
        when(selfPlanItemRepository.findBySubmissionId(submissionId))
                .thenReturn(List.of(afternoonSelf, eveningSelf));
        when(selfPlanSubmissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));
        when(selfPlanItemRepository.findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(customerId, today))
                .thenReturn(List.of(afternoonSelf, eveningSelf));
        when(mealPlanRepository.findByClientIdAndIsPublishedTrueOrderByWeekStartDesc(customerId))
                .thenReturn(List.of(plan));
        when(mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(planId))
                .thenReturn(List.of(ptAfternoonEaten));
        when(dietLogRepository.findByCustomerIdAndLogDate(customerId, today)).thenReturn(List.of());

        var result = ptWorkspaceService.listPendingSelfPlanSubmissions(ptId);

        assertEquals(1, result.getData().size());
        assertEquals(1, result.getData().get(0).getItems().size());
        assertEquals("Self tối", result.getData().get(0).getItems().get(0).getItemName());
    }

    @Test
    void listPendingSelfPlanSubmissions_hidesLockedReviewWhenPeriodAlreadyEaten() {
        UUID ptId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID submissionId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();
        LocalDate today = LocalDate.now();

        SelfPlanSubmission submission = SelfPlanSubmission.builder()
                .customerId(customerId)
                .ptId(ptId)
                .planDate(today)
                .status(SelfPlanSubmissionStatus.PENDING)
                .build();
        ReflectionTestUtils.setField(submission, "id", submissionId);

        SelfPlanItem eveningSelf = SelfPlanItem.builder()
                .customerId(customerId)
                .planDate(today)
                .mealPeriod(MealPeriod.EVENING)
                .mealType(com.sba.nutricanbe.diet.enums.MealType.DINNER)
                .itemName("Rau giền cơm")
                .eaten(false)
                .lockedByReview(true)
                .submissionId(submissionId)
                .build();

        MealPlan plan = MealPlan.builder()
                .clientId(customerId)
                .ptId(ptId)
                .weekStart(today.with(java.time.DayOfWeek.MONDAY))
                .isPublished(true)
                .build();
        ReflectionTestUtils.setField(plan, "id", planId);
        MealPlanItem ptEveningEaten = MealPlanItem.builder()
                .mealPlanId(planId)
                .planDate(today)
                .mealPeriod(MealPeriod.EVENING)
                .mealType(com.sba.nutricanbe.diet.enums.MealType.DINNER)
                .eaten(true)
                .sourceType(MealPlanItemSourceType.PT_ORIGINAL)
                .build();

        when(selfPlanSubmissionRepository.findByPtIdAndStatusOrderBySubmittedAtDesc(ptId, SelfPlanSubmissionStatus.PENDING))
                .thenReturn(List.of(submission));
        when(selfPlanItemRepository.findBySubmissionId(submissionId))
                .thenReturn(List.of(eveningSelf));
        when(selfPlanSubmissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));
        when(selfPlanItemRepository.findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(customerId, today))
                .thenReturn(List.of(eveningSelf));
        when(mealPlanRepository.findByClientIdAndIsPublishedTrueOrderByWeekStartDesc(customerId))
                .thenReturn(List.of(plan));
        when(mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(planId))
                .thenReturn(List.of(ptEveningEaten));
        when(dietLogRepository.findByCustomerIdAndLogDate(customerId, today)).thenReturn(List.of());

        var result = ptWorkspaceService.listPendingSelfPlanSubmissions(ptId);

        assertEquals(0, result.getData().size());
    }
}
