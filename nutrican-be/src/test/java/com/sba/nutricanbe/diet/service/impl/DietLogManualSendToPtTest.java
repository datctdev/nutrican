package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.diet.dto.request.CreateDietLogRequest;
import com.sba.nutricanbe.diet.dto.request.DietLogItemRequest;
import com.sba.nutricanbe.diet.dto.response.DietLogResponse;
import com.sba.nutricanbe.diet.dto.response.IntakeControlResult;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.DietLogItem;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.IntakeStatus;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.diet.service.DietPrefCheckService;
import com.sba.nutricanbe.diet.service.IntakeControlLoopService;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.service.UserQueryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
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
    @Mock private IntakeControlLoopService intakeControlLoopService;
    @Mock private com.sba.nutricanbe.diet.service.UserRecipeService userRecipeService;
    @Mock private DietPrefCheckService dietPrefCheckService;

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
        when(dietLogHelper.resolveReviewStatus(eq(customerId), eq(true)))
                .thenReturn(DietLogReviewStatus.PENDING);
        when(dietLogHelper.toResponse(any())).thenReturn(DietLogResponse.builder().reviewStatus(DietLogReviewStatus.PENDING).build());
        when(intakeControlLoopService.evaluateAfterLog(eq(customerId), any(), eq(false)))
                .thenReturn(IntakeControlResult.builder().intakeStatus(IntakeStatus.OK).build());

        var result = dietLogService.createLog(customerId, request);

        assertEquals(DietLogReviewStatus.PENDING, result.getData().getReviewStatus());
        verify(dietLogHelper).notifyPtOfNewLog(any(DietLog.class));
    }

    @Test
    void createLog_withCatalogItemsOnly_skipsPtReviewEvenWhenFeSendsSendToPt() {
        UUID customerId = UUID.randomUUID();
        when(userQueryService.findUserById(customerId)).thenReturn(Optional.of(User.builder().build()));

        CreateDietLogRequest request = new CreateDietLogRequest();
        request.setMealType(MealType.LUNCH);
        request.setSendToPt(true);
        request.setItems(List.of(itemFromCatalog(), itemFromCatalog()));

        stubCatalogBackedItems();
        when(dietLogRepository.save(any(DietLog.class))).thenAnswer(inv -> inv.getArgument(0));
        when(dietLogHelper.toResponse(any())).thenAnswer(inv -> DietLogResponse.builder()
                .reviewStatus(((DietLog) inv.getArgument(0)).getReviewStatus())
                .build());

        var result = dietLogService.createLog(customerId, request);

        assertEquals(DietLogReviewStatus.NOT_REQUIRED, result.getData().getReviewStatus());
        verify(dietLogHelper, never()).notifyPtOfNewLog(any(DietLog.class));
        verify(dietLogHelper, never()).resolveReviewStatus(any(), anyBoolean());
    }

    @Test
    void createLog_withCustomIngredient_staysPendingWhenPtIsActive() {
        UUID customerId = UUID.randomUUID();
        when(userQueryService.findUserById(customerId)).thenReturn(Optional.of(User.builder().build()));

        CreateDietLogRequest request = new CreateDietLogRequest();
        request.setMealType(MealType.LUNCH);
        request.setItems(List.of(itemFromCatalog(), customItem()));

        doAnswer(invocation -> {
            DietLog log = invocation.getArgument(0);
            log.getItems().add(DietLogItem.builder().foodItemId(UUID.randomUUID()).build());
            log.getItems().add(DietLogItem.builder().foodItemId(null).build());
            return null;
        }).when(dietLogHelper).applyItemsToLog(any(DietLog.class), any());
        when(dietLogHelper.hasActivePt(customerId)).thenReturn(true);
        when(dietLogHelper.resolveReviewStatus(eq(customerId), eq(true)))
                .thenReturn(DietLogReviewStatus.PENDING);
        when(dietLogRepository.save(any(DietLog.class))).thenAnswer(inv -> inv.getArgument(0));
        when(dietLogHelper.toResponse(any())).thenAnswer(inv -> DietLogResponse.builder()
                .reviewStatus(((DietLog) inv.getArgument(0)).getReviewStatus())
                .build());
        when(intakeControlLoopService.evaluateAfterLog(eq(customerId), any(), eq(false)))
                .thenReturn(IntakeControlResult.builder().intakeStatus(IntakeStatus.OK).build());

        var result = dietLogService.createLog(customerId, request);

        assertEquals(DietLogReviewStatus.PENDING, result.getData().getReviewStatus());
        verify(dietLogHelper).notifyPtOfNewLog(any(DietLog.class));
    }

    @Test
    void createLog_withCustomIngredientAndNoPt_doesNotRequireReview() {
        UUID customerId = UUID.randomUUID();
        when(userQueryService.findUserById(customerId)).thenReturn(Optional.of(User.builder().build()));

        CreateDietLogRequest request = new CreateDietLogRequest();
        request.setMealType(MealType.LUNCH);
        request.setItems(List.of(customItem()));

        doAnswer(invocation -> {
            DietLog log = invocation.getArgument(0);
            log.getItems().add(DietLogItem.builder().foodItemId(null).build());
            return null;
        }).when(dietLogHelper).applyItemsToLog(any(DietLog.class), any());
        when(dietLogHelper.hasActivePt(customerId)).thenReturn(false);
        when(dietLogHelper.resolveReviewStatus(eq(customerId), eq(false)))
                .thenReturn(DietLogReviewStatus.NOT_REQUIRED);
        when(dietLogRepository.save(any(DietLog.class))).thenAnswer(inv -> inv.getArgument(0));
        when(dietLogHelper.toResponse(any())).thenAnswer(inv -> DietLogResponse.builder()
                .reviewStatus(((DietLog) inv.getArgument(0)).getReviewStatus())
                .build());

        var result = dietLogService.createLog(customerId, request);

        assertEquals(DietLogReviewStatus.NOT_REQUIRED, result.getData().getReviewStatus());
        verify(dietLogHelper, never()).notifyPtOfNewLog(any(DietLog.class));
    }

    @Test
    void createLog_withCatalogBackedRecipe_skipsPtReview() {
        UUID customerId = UUID.randomUUID();
        UUID recipeId = UUID.randomUUID();
        when(userQueryService.findUserById(customerId)).thenReturn(Optional.of(User.builder().build()));

        CreateDietLogRequest request = new CreateDietLogRequest();
        request.setMealType(MealType.DINNER);
        request.setRecipeId(recipeId);
        request.setSendToPt(true);
        when(userRecipeService.toLogItems(customerId, recipeId))
                .thenReturn(List.of(itemFromCatalog(), itemFromCatalog()));

        stubCatalogBackedItems();
        when(dietLogRepository.save(any(DietLog.class))).thenAnswer(inv -> inv.getArgument(0));
        when(dietLogHelper.toResponse(any())).thenAnswer(inv -> DietLogResponse.builder()
                .reviewStatus(((DietLog) inv.getArgument(0)).getReviewStatus())
                .build());

        var result = dietLogService.createLog(customerId, request);

        assertEquals(DietLogReviewStatus.NOT_REQUIRED, result.getData().getReviewStatus());
        verify(userRecipeService, times(1)).toLogItems(customerId, recipeId);
        verify(dietLogHelper, never()).notifyPtOfNewLog(any(DietLog.class));
    }

    private void stubCatalogBackedItems() {
        doAnswer(invocation -> {
            DietLog log = invocation.getArgument(0);
            log.getItems().add(DietLogItem.builder().foodItemId(UUID.randomUUID()).build());
            log.getItems().add(DietLogItem.builder().foodItemId(UUID.randomUUID()).build());
            return null;
        }).when(dietLogHelper).applyItemsToLog(any(DietLog.class), any());
    }

    private static DietLogItemRequest itemFromCatalog() {
        DietLogItemRequest item = new DietLogItemRequest();
        item.setFoodItemId(UUID.randomUUID());
        item.setQuantityG(java.math.BigDecimal.valueOf(100));
        return item;
    }

    private static DietLogItemRequest customItem() {
        DietLogItemRequest item = new DietLogItemRequest();
        item.setItemName("Nước sốt nhà làm");
        item.setQuantityG(java.math.BigDecimal.valueOf(50));
        item.setCalories(java.math.BigDecimal.valueOf(120));
        return item;
    }

    @Test
    void updateLog_withSendToPt_setsPendingAndNotifiesPt() {
        UUID customerId = UUID.randomUUID();
        UUID logId = UUID.randomUUID();
        DietLog existing = DietLog.builder()
                .customerId(customerId)
                .status(DietLogStatus.MANUAL_REQUIRED)
                .reviewStatus(DietLogReviewStatus.NOT_REQUIRED)
                .build();
        when(dietLogRepository.findById(logId)).thenReturn(Optional.of(existing));
        when(dietLogRepository.save(any(DietLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(dietLogHelper.resolveReviewStatus(eq(customerId), eq(true)))
                .thenReturn(DietLogReviewStatus.PENDING);
        when(dietLogHelper.toResponse(any())).thenAnswer(invocation -> {
            DietLog saved = invocation.getArgument(0);
            return DietLogResponse.builder().reviewStatus(saved.getReviewStatus()).build();
        });

        CreateDietLogRequest request = new CreateDietLogRequest();
        request.setCalories(java.math.BigDecimal.valueOf(450));
        request.setProtein(java.math.BigDecimal.valueOf(20));
        request.setCarb(java.math.BigDecimal.valueOf(55));
        request.setFat(java.math.BigDecimal.valueOf(12));
        request.setSendToPt(true);

        var result = dietLogService.updateLog(logId, customerId, request);

        assertEquals(DietLogReviewStatus.PENDING, result.getData().getReviewStatus());
        assertEquals(DietLogStatus.LOGGED, existing.getStatus());
        verify(dietLogHelper).assignPtReviewerIfNeeded(existing, customerId);
        verify(dietLogHelper).notifyPtOfNewLog(existing);
    }
}
