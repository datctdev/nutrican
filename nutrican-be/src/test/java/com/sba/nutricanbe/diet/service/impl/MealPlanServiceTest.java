package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.diet.dto.request.MealPlanItemRequest;
import com.sba.nutricanbe.diet.dto.request.MealPlanMealActionRequest;
import com.sba.nutricanbe.diet.dto.request.MealPlanRequest;
import com.sba.nutricanbe.diet.dto.response.FoodItemResponse;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealPlanSkipReason;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanRepository;
import com.sba.nutricanbe.diet.repository.MealPlanSuggestionRepository;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.diet.service.DietPrefCheckService;
import com.sba.nutricanbe.diet.service.FoodCatalogService;
import com.sba.nutricanbe.diet.service.MealPlanItemMacrosResolver;
import com.sba.nutricanbe.user.entity.MacroTarget;
import com.sba.nutricanbe.user.repository.MacroTargetRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MealPlanServiceTest {

    @Mock private MealPlanRepository mealPlanRepository;
    @Mock private MealPlanItemRepository mealPlanItemRepository;
    @Mock private PtClientMappingRepository mappingRepository;
    @Mock private DietPrefCheckService dietPrefCheckService;
    @Mock private FoodCatalogService foodCatalogService;
    @Mock private FoodItemRepository foodItemRepository;
    @Mock private DietLogHelper dietLogHelper;
    @Mock private MacroTargetRepository macroTargetRepository;
    @Mock private MealPlanSuggestionRepository mealPlanSuggestionRepository;
    @Mock private MealPlanItemMacrosResolver mealPlanItemMacrosResolver;

    @InjectMocks
    private MealPlanServiceImpl mealPlanService;

    @Test
    void skipMeal_withMealPeriod_onlySkipsMatchingPeriod() {
        UUID customerId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();
        LocalDate planDate = LocalDate.now();

        MealPlan plan = new MealPlan();
        plan.setClientId(customerId);
        plan.setIsPublished(true);
        when(mealPlanRepository.findById(planId)).thenReturn(Optional.of(plan));

        UUID itemId = UUID.randomUUID();
        MealPlanItem afternoonItem = mock(MealPlanItem.class);
        when(afternoonItem.getId()).thenReturn(itemId);
        when(afternoonItem.getPlanDate()).thenReturn(planDate);
        when(afternoonItem.getMealPeriod()).thenReturn(MealPeriod.AFTERNOON);
        when(afternoonItem.getMealType()).thenReturn(MealType.SNACK);
        when(afternoonItem.getEaten()).thenReturn(false);
        lenient().when(afternoonItem.getSkipReason()).thenReturn(null);
        when(mealPlanItemRepository.findByMealPlanIdAndPlanDateAndMealPeriod(
                planId, planDate, MealPeriod.AFTERNOON)).thenReturn(List.of(afternoonItem));
        when(mealPlanSuggestionRepository.existsByMealPlanItemIdAndStatus(any(), any())).thenReturn(false);
        when(mealPlanItemRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        MealPlanMealActionRequest request = new MealPlanMealActionRequest();
        request.setPlanDate(planDate);
        request.setMealPeriod("AFTERNOON");
        request.setSkipReason("NO_TIME");

        mealPlanService.skipMeal(customerId, planId, request);

        verify(mealPlanItemRepository).findByMealPlanIdAndPlanDateAndMealPeriod(
                planId, planDate, MealPeriod.AFTERNOON);
        verify(mealPlanItemRepository, never()).findByMealPlanIdAndPlanDateAndMealType(any(), any(), any());
        verify(afternoonItem).setSkipReason(MealPlanSkipReason.NO_TIME);
    }

    @Test
    void computeMacroWarning_whenDayExceeds110Percent_returnsWarning() {
        UUID clientId = UUID.randomUUID();
        LocalDate day = LocalDate.now();
        when(macroTargetRepository.findByUserId(clientId)).thenReturn(Optional.of(
                MacroTarget.builder().dailyCalories(BigDecimal.valueOf(2000)).build()));

        UUID foodId = UUID.randomUUID();
        when(foodCatalogService.findByResNetFoodCode("pho")).thenReturn(Optional.of(
                FoodItemResponse.builder().id(foodId).build()));
        when(foodItemRepository.findById(foodId)).thenReturn(Optional.of(new com.sba.nutricanbe.diet.entity.FoodItem()));
        when(dietLogHelper.macrosForFood(any(), any())).thenReturn(
                new MacroNutrients(BigDecimal.valueOf(2500), BigDecimal.TEN, BigDecimal.TEN, BigDecimal.TEN));

        MealPlanItemRequest item = new MealPlanItemRequest();
        item.setPlanDate(day);
        item.setFoodCode("pho");
        item.setPortionGrams(BigDecimal.valueOf(100));

        String warning = mealPlanService.computeMacroWarning(clientId, List.of(item));

        assertNotNull(warning);
    }

    @Test
    void computeMacroWarning_whenWithinTarget_returnsNull() {
        UUID clientId = UUID.randomUUID();
        LocalDate day = LocalDate.now();
        when(macroTargetRepository.findByUserId(clientId)).thenReturn(Optional.of(
                MacroTarget.builder().dailyCalories(BigDecimal.valueOf(2000)).build()));

        UUID foodId = UUID.randomUUID();
        when(foodCatalogService.findByResNetFoodCode("pho")).thenReturn(Optional.of(
                FoodItemResponse.builder().id(foodId).build()));
        when(foodItemRepository.findById(foodId)).thenReturn(Optional.of(new com.sba.nutricanbe.diet.entity.FoodItem()));
        when(dietLogHelper.macrosForFood(any(), any())).thenReturn(
                new MacroNutrients(BigDecimal.valueOf(500), BigDecimal.TEN, BigDecimal.TEN, BigDecimal.TEN));

        MealPlanItemRequest item = new MealPlanItemRequest();
        item.setPlanDate(day);
        item.setFoodCode("pho");
        item.setPortionGrams(BigDecimal.valueOf(100));

        String warning = mealPlanService.computeMacroWarning(clientId, List.of(item));

        assertNull(warning);
    }

    @Test
    void updatePlan_whenEatenItemPortionChanges_rejectsUpdate() {
        UUID ptId = UUID.randomUUID();
        UUID clientId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        LocalDate weekStart = LocalDate.now();
        LocalDate planDate = weekStart.plusDays(1);
        MealPlan plan = mockPlanForUpdate(ptId, clientId, planId, weekStart);
        MealPlanItem eatenItem = mockEatenItem(itemId, planDate);
        when(mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(planId))
                .thenReturn(List.of(eatenItem));

        MealPlanItemRequest itemRequest = matchingRequest(itemId, planDate);
        itemRequest.setPortionGrams(BigDecimal.valueOf(120));
        MealPlanRequest request = new MealPlanRequest();
        request.setWeekStart(weekStart);
        request.setItems(List.of(itemRequest));

        assertThrows(BadRequestException.class,
                () -> mealPlanService.updatePlan(ptId, clientId, request));
        verify(mealPlanItemRepository, never()).save(eatenItem);
    }

    @Test
    void updatePlan_whenEatenItemIsMissing_rejectsDelete() {
        UUID ptId = UUID.randomUUID();
        UUID clientId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();
        LocalDate weekStart = LocalDate.now();
        MealPlan plan = mockPlanForUpdate(ptId, clientId, planId, weekStart);
        MealPlanItem eatenItem = mockEatenItem(UUID.randomUUID(), weekStart.plusDays(1));
        when(mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(planId))
                .thenReturn(List.of(eatenItem));

        MealPlanRequest request = new MealPlanRequest();
        request.setWeekStart(weekStart);
        request.setItems(List.of());

        assertThrows(BadRequestException.class,
                () -> mealPlanService.updatePlan(ptId, clientId, request));
        verify(mealPlanItemRepository, never()).deleteAll(any());
    }

    @Test
    void updatePlan_whenCustomerUnmarksItem_allowsPortionChange() {
        UUID ptId = UUID.randomUUID();
        UUID clientId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        LocalDate weekStart = LocalDate.now();
        LocalDate planDate = weekStart.plusDays(1);
        mockPlanForUpdate(ptId, clientId, planId, weekStart);
        MealPlanItem editableItem = mock(MealPlanItem.class);
        when(editableItem.getId()).thenReturn(itemId);
        when(editableItem.getEaten()).thenReturn(false);
        when(mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(planId))
                .thenReturn(List.of(editableItem), List.of(editableItem));
        when(macroTargetRepository.findByUserId(clientId)).thenReturn(Optional.empty());
        when(foodCatalogService.findByResNetFoodCode("egg")).thenReturn(Optional.empty());
        when(dietPrefCheckService.checkPlan(any(), any())).thenReturn(List.of());

        MealPlanItemRequest itemRequest = matchingRequest(itemId, planDate);
        itemRequest.setPortionGrams(BigDecimal.valueOf(120));
        MealPlanRequest request = new MealPlanRequest();
        request.setWeekStart(weekStart);
        request.setItems(List.of(itemRequest));

        mealPlanService.updatePlan(ptId, clientId, request);

        verify(editableItem).setPortionGrams(BigDecimal.valueOf(120));
        verify(mealPlanItemRepository).save(editableItem);
    }

    @Test
    void unskipItem_returnsEnrichedMacrosFromResolver() {
        UUID customerId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();
        MealPlan plan = MealPlan.builder().clientId(customerId).isPublished(true).build();
        org.springframework.test.util.ReflectionTestUtils.setField(plan, "id", planId);
        MealPlanItem item = MealPlanItem.builder()
                .mealPlanId(planId)
                .planDate(LocalDate.now())
                .mealType(MealType.LUNCH)
                .foodItemId(UUID.randomUUID())
                .portionGrams(BigDecimal.valueOf(200))
                .skipReason(MealPlanSkipReason.DONT_LIKE)
                .build();
        org.springframework.test.util.ReflectionTestUtils.setField(item, "id", itemId);
        MacroNutrients macros = new MacroNutrients(
                BigDecimal.valueOf(420), BigDecimal.valueOf(30),
                BigDecimal.valueOf(45), BigDecimal.valueOf(12));
        when(mealPlanItemRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(mealPlanRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(mealPlanItemRepository.save(item)).thenAnswer(inv -> inv.getArgument(0));
        when(mealPlanItemMacrosResolver.resolve(item)).thenReturn(macros);

        var response = mealPlanService.unskipItem(customerId, itemId);

        assertNotNull(response);
        assertEquals(0, BigDecimal.valueOf(420).compareTo(response.getCalories()));
        assertEquals(0, BigDecimal.valueOf(30).compareTo(response.getProtein()));
    }

    private MealPlan mockPlanForUpdate(
            UUID ptId, UUID clientId, UUID planId, LocalDate weekStart) {
        MealPlan plan = mock(MealPlan.class);
        when(mappingRepository.existsByPt_IdAndClient_IdAndStatus(any(), any(), any()))
                .thenReturn(true);
        when(mealPlanRepository.findFirstByClientIdAndWeekStartOrderByCreatedAtDesc(clientId, weekStart))
                .thenReturn(Optional.of(plan));
        when(plan.getPtId()).thenReturn(ptId);
        when(plan.getId()).thenReturn(planId);
        when(mealPlanRepository.save(plan)).thenReturn(plan);
        return plan;
    }

    private MealPlanItem mockEatenItem(UUID itemId, LocalDate planDate) {
        MealPlanItem item = mock(MealPlanItem.class);
        when(item.getId()).thenReturn(itemId);
        when(item.getEaten()).thenReturn(true);
        lenient().when(item.getPlanDate()).thenReturn(planDate);
        lenient().when(item.getMealType()).thenReturn(MealType.BREAKFAST);
        lenient().when(item.getFoodCode()).thenReturn("egg");
        lenient().when(item.getFreeText()).thenReturn("Trứng gà");
        lenient().when(item.getPortionGrams()).thenReturn(BigDecimal.valueOf(100));
        lenient().when(item.getNote()).thenReturn(null);
        return item;
    }

    private MealPlanItemRequest matchingRequest(UUID itemId, LocalDate planDate) {
        MealPlanItemRequest request = new MealPlanItemRequest();
        request.setId(itemId);
        request.setPlanDate(planDate);
        request.setMealType(MealType.BREAKFAST);
        request.setFoodCode("egg");
        request.setFreeText("Trứng gà");
        request.setPortionGrams(BigDecimal.valueOf(100));
        request.setNote("");
        return request;
    }
}
