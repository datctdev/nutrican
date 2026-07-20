package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.common.util.MealPeriods;
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
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DietLogLateTickTest {

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
    @Mock private DietPrefCheckService dietPrefCheckService;

    @InjectMocks
    private DietLogServiceImpl dietLogService;

    @Test
    void createLog_lateTick_allowsPastPeriodOnToday() {
        MealPeriod pastPeriod = MealPeriod.NOON;
        Assumptions.assumeTrue(MealPeriods.isPastPeriodForLateTick(pastPeriod));

        UUID customerId = UUID.randomUUID();
        when(userQueryService.findUserById(customerId)).thenReturn(Optional.of(User.builder().build()));

        CreateDietLogRequest request = new CreateDietLogRequest();
        request.setMealType(MealType.LUNCH);
        request.setMealPeriod(pastPeriod);
        request.setLogDate(DietDates.todayVn());
        request.setLateTickReason("Quên tick buổi trưa lúc ăn");
        request.setCalories(BigDecimal.valueOf(300));
        request.setSendToPt(false);

        DietLog saved = DietLog.builder()
                .customerId(customerId)
                .mealPeriod(pastPeriod)
                .status(DietLogStatus.LOGGED)
                .reviewStatus(DietLogReviewStatus.NOT_REQUIRED)
                .build();
        when(dietLogRepository.save(any(DietLog.class))).thenReturn(saved);
        when(dietLogHelper.resolveReviewStatus(eq(customerId), eq(false)))
                .thenReturn(DietLogReviewStatus.NOT_REQUIRED);
        when(dietLogHelper.toResponse(any())).thenReturn(
                DietLogResponse.builder().mealPeriod(pastPeriod).build());
        when(intakeControlLoopService.evaluateAfterLog(eq(customerId), any(), any(Boolean.class)))
                .thenReturn(IntakeControlResult.builder().intakeStatus(IntakeStatus.OK).build());

        var result = assertDoesNotThrow(() -> dietLogService.createLog(customerId, request));

        assertEquals(pastPeriod, result.getData().getMealPeriod());
    }

    @Test
    void createLog_withoutLateTickReason_rejectsPastPeriodOnToday() {
        MealPeriod pastPeriod = MealPeriod.NOON;
        Assumptions.assumeTrue(MealPeriods.isPastPeriodForLateTick(pastPeriod));
        Assumptions.assumeTrue(MealPeriods.current() != pastPeriod);

        UUID customerId = UUID.randomUUID();
        when(userQueryService.findUserById(customerId)).thenReturn(Optional.of(User.builder().build()));

        CreateDietLogRequest request = new CreateDietLogRequest();
        request.setMealType(MealType.LUNCH);
        request.setMealPeriod(pastPeriod);
        request.setLogDate(DietDates.todayVn());
        request.setCalories(BigDecimal.valueOf(300));

        assertThrows(BadRequestException.class, () -> dietLogService.createLog(customerId, request));
    }
}
