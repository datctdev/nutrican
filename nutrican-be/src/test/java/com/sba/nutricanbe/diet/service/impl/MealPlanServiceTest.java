package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.diet.controller.MealPlanController.MealPlanItemRequest;
import com.sba.nutricanbe.diet.dto.FoodItemResponse;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanRepository;
import com.sba.nutricanbe.diet.service.AllergyCheckService;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.diet.service.FoodCatalogService;
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

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MealPlanServiceTest {

    @Mock private MealPlanRepository mealPlanRepository;
    @Mock private MealPlanItemRepository mealPlanItemRepository;
    @Mock private PtClientMappingRepository mappingRepository;
    @Mock private AllergyCheckService allergyCheckService;
    @Mock private FoodCatalogService foodCatalogService;
    @Mock private FoodItemRepository foodItemRepository;
    @Mock private DietLogHelper dietLogHelper;
    @Mock private MacroTargetRepository macroTargetRepository;

    @InjectMocks
    private MealPlanServiceImpl mealPlanService;

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
}
