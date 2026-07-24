package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.diet.dto.request.CreateDietLogRequest;
import com.sba.nutricanbe.diet.dto.response.DietLogResponse;
import com.sba.nutricanbe.diet.dto.response.IntakeControlResult;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.IntakeStatus;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.diet.service.DietPrefCheckService;
import com.sba.nutricanbe.diet.service.IntakeControlLoopService;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.service.UserQueryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DietLogPlanComplianceTest {

    @Mock private DietLogRepository dietLogRepository;
    @Mock private com.sba.nutricanbe.diet.repository.DietLogImageRepository dietLogImageRepository;
    @Mock private com.sba.nutricanbe.diet.repository.DietLogItemRepository dietLogItemRepository;
    @Mock private UserQueryService userQueryService;
    @Mock private com.sba.nutricanbe.diet.repository.FoodItemRepository foodItemRepository;
    @Mock private com.sba.nutricanbe.infrastructure.storage.StorageService minioService;
    @Mock private DietLogHelper dietLogHelper;
    @Mock private IntakeControlLoopService intakeControlLoopService;
    @Mock private com.sba.nutricanbe.diet.service.UserRecipeService userRecipeService;
    @Mock private DietPrefCheckService dietPrefCheckService;

    @InjectMocks
    private DietLogServiceImpl dietLogService;

    @Test
    void createPlanComplianceLog_withActivePt_isNotRequiredAndDoesNotNotify() {
        UUID customerId = UUID.randomUUID();
        when(userQueryService.findUserById(customerId)).thenReturn(Optional.of(User.builder().build()));

        CreateDietLogRequest request = new CreateDietLogRequest();
        request.setMealType(MealType.BREAKFAST);
        request.setMealPeriod(MealPeriod.MORNING);
        request.setFoodDescription("Cháo yến mạch");
        request.setCalories(BigDecimal.valueOf(400));
        request.setSendToPt(false);

        when(dietLogRepository.save(any(DietLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(dietLogHelper.toResponse(any())).thenAnswer(invocation -> {
            DietLog saved = invocation.getArgument(0);
            return DietLogResponse.builder().reviewStatus(saved.getReviewStatus()).build();
        });
        when(intakeControlLoopService.evaluateAfterLog(eq(customerId), any(), eq(true)))
                .thenReturn(IntakeControlResult.builder().intakeStatus(IntakeStatus.OK).build());

        var result = dietLogService.createPlanComplianceLog(customerId, request);

        assertEquals(DietLogReviewStatus.NOT_REQUIRED, result.getData().getReviewStatus());

        ArgumentCaptor<DietLog> captor = ArgumentCaptor.forClass(DietLog.class);
        verify(dietLogRepository).save(captor.capture());
        assertEquals(DietLogReviewStatus.NOT_REQUIRED, captor.getValue().getReviewStatus());
        assertEquals(DietLogStatus.LOGGED, captor.getValue().getStatus());

        verify(dietLogHelper, never()).hasActivePt(any());
        verify(dietLogHelper, never()).resolveReviewStatus(any(), any(Boolean.class));
        verify(dietLogHelper, never()).notifyPtOfNewLog(any());
    }
}
