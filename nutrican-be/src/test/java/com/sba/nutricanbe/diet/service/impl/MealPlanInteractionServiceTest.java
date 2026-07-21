package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.diet.dto.request.MealPlanMealActionRequest;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealPlanSkipReason;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanRepository;
import com.sba.nutricanbe.diet.repository.MealPlanSuggestionRepository;
import com.sba.nutricanbe.diet.service.MealPlanItemMacrosResolver;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MealPlanInteractionServiceTest {

    @Mock private MealPlanRepository mealPlanRepository;
    @Mock private MealPlanItemRepository mealPlanItemRepository;
    @Mock private MealPlanSuggestionRepository mealPlanSuggestionRepository;
    @Mock private MealPlanItemMacrosResolver mealPlanItemMacrosResolver;

    @InjectMocks
    private MealPlanInteractionServiceImpl mealPlanService;

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
}
