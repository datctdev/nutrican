package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.diet.dto.CreateDietLogRequest;
import com.sba.nutricanbe.diet.dto.DietLogResponse;
import com.sba.nutricanbe.diet.dto.IntakeControlResult;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.IntakeStatus;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.diet.service.IntakeControlLoopService;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.service.UserQueryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DietLogManualSendToPtTest {

    @Mock private DietLogRepository dietLogRepository;
    @Mock private com.sba.nutricanbe.diet.repository.DietLogImageRepository dietLogImageRepository;
    @Mock private com.sba.nutricanbe.diet.repository.DietLogItemRepository dietLogItemRepository;
    @Mock private UserQueryService userQueryService;
    @Mock private com.sba.nutricanbe.diet.repository.FoodItemRepository foodItemRepository;
    @Mock private com.sba.nutricanbe.infrastructure.storage.StorageService minioService;
    @Mock private DietLogHelper dietLogHelper;
    @Mock private com.sba.nutricanbe.diet.repository.SosTicketRepository sosTicketRepository;
    @Mock private IntakeControlLoopService intakeControlLoopService;
    @Mock private com.sba.nutricanbe.diet.service.UserRecipeService userRecipeService;
    @Mock private com.sba.nutricanbe.diet.service.AllergyCheckService allergyCheckService;
    @Mock private com.sba.nutricanbe.diet.service.DietPrefCheckService dietPrefCheckService;

    @InjectMocks
    private DietLogServiceImpl dietLogService;

    @Test
    void createLog_withSendToPt_setsPendingAndNotifiesPt() {
        UUID customerId = UUID.randomUUID();
        when(userQueryService.findUserById(customerId)).thenReturn(Optional.of(User.builder().build()));
        CreateDietLogRequest request = new CreateDietLogRequest();
        request.setMealType(MealType.LUNCH);
        request.setSendToPt(true);
        request.setCalories(java.math.BigDecimal.valueOf(500));

        DietLog saved = DietLog.builder()
                .customerId(customerId)
                .status(DietLogStatus.LOGGED)
                .reviewStatus(DietLogReviewStatus.PENDING)
                .build();
        when(dietLogRepository.save(any(DietLog.class))).thenReturn(saved);
        when(dietLogHelper.toResponse(any())).thenReturn(DietLogResponse.builder().reviewStatus(DietLogReviewStatus.PENDING).build());
        when(intakeControlLoopService.evaluateAfterLog(eq(customerId), any(), eq(false)))
                .thenReturn(IntakeControlResult.builder().intakeStatus(IntakeStatus.OK).build());

        var result = dietLogService.createLog(customerId, request);

        assertEquals(DietLogReviewStatus.PENDING, result.getData().getReviewStatus());
        verify(dietLogHelper).notifyPtOfNewLog(any(DietLog.class));
    }
}
