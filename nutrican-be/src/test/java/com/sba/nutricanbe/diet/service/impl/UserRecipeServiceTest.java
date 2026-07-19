package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.diet.dto.request.RecipeRequest;
import com.sba.nutricanbe.diet.dto.response.PlanDietPrefWarning;
import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.diet.entity.UserRecipe;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.diet.repository.UserRecipeRepository;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.diet.service.DietPrefCheckService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserRecipeServiceTest {

    @Mock private UserRecipeRepository recipeRepository;
    @Mock private FoodItemRepository foodItemRepository;
    @Mock private DietLogHelper dietLogHelper;
    @Mock private DietPrefCheckService dietPrefCheckService;

    @InjectMocks
    private UserRecipeServiceImpl userRecipeService;

    @Test
    void create_sumsMacrosFromIngredients() {
        UUID foodId = UUID.randomUUID();
        FoodItem rice = FoodItem.builder().nameVi("Gạo").calories(BigDecimal.valueOf(130)).build();
        ReflectionTestUtils.setField(rice, "id", foodId);
        when(foodItemRepository.findById(foodId)).thenReturn(Optional.of(rice));
        when(dietLogHelper.macrosForFood(rice, BigDecimal.valueOf(200)))
                .thenReturn(MacroNutrients.of(
                        BigDecimal.valueOf(260), BigDecimal.valueOf(5), BigDecimal.valueOf(55), BigDecimal.valueOf(1)));
        when(dietPrefCheckService.checkFoodItems(any(), anyList())).thenReturn(List.of());

        RecipeRequest request = new RecipeRequest();
        request.setName("Cơm");
        RecipeRequest.RecipeIngredientRequest ing = new RecipeRequest.RecipeIngredientRequest();
        ing.setFoodItemId(foodId);
        ing.setGram(BigDecimal.valueOf(200));
        request.setIngredients(List.of(ing));

        when(recipeRepository.save(any(UserRecipe.class))).thenAnswer(inv -> {
            UserRecipe r = inv.getArgument(0);
            ReflectionTestUtils.setField(r, "id", UUID.randomUUID());
            return r;
        });

        var response = userRecipeService.create(UUID.randomUUID(), request);
        assertEquals(0, response.getTotalCalories().compareTo(BigDecimal.valueOf(260)));
    }

    @Test
    void create_emptyIngredientsThrows() {
        RecipeRequest request = new RecipeRequest();
        request.setName("Empty");
        request.setIngredients(List.of());
        assertThrows(BadRequestException.class, () -> userRecipeService.create(UUID.randomUUID(), request));
    }

    @Test
    void create_vegetarianWithMeatReturnsPrefWarning() {
        UUID foodId = UUID.randomUUID();
        FoodItem beef = FoodItem.builder().nameVi("Bò").calories(BigDecimal.valueOf(250)).build();
        ReflectionTestUtils.setField(beef, "id", foodId);
        when(foodItemRepository.findById(foodId)).thenReturn(Optional.of(beef));
        when(dietLogHelper.macrosForFood(beef, BigDecimal.valueOf(100)))
                .thenReturn(MacroNutrients.of(BigDecimal.valueOf(250), null, null, null));
        when(dietPrefCheckService.checkFoodItems(any(), anyList())).thenReturn(List.of(
                PlanDietPrefWarning.builder().message("Không phù hợp chế độ VEGETARIAN").foodCode("beef").build()
        ));
        when(recipeRepository.save(any(UserRecipe.class))).thenAnswer(inv -> {
            UserRecipe r = inv.getArgument(0);
            ReflectionTestUtils.setField(r, "id", UUID.randomUUID());
            return r;
        });

        RecipeRequest request = new RecipeRequest();
        request.setName("Bò");
        RecipeRequest.RecipeIngredientRequest ing = new RecipeRequest.RecipeIngredientRequest();
        ing.setFoodItemId(foodId);
        ing.setGram(BigDecimal.valueOf(100));
        request.setIngredients(List.of(ing));

        var response = userRecipeService.create(UUID.randomUUID(), request);
        assertFalse(response.getDietPrefWarnings().isEmpty());
    }

    @Test
    void update_recalculatesMacros() {
        UUID userId = UUID.randomUUID();
        UUID recipeId = UUID.randomUUID();
        UUID foodId = UUID.randomUUID();
        UserRecipe existing = UserRecipe.builder().userId(userId).name("Old").ingredients(new java.util.ArrayList<>()).build();
        ReflectionTestUtils.setField(existing, "id", recipeId);
        when(recipeRepository.findById(recipeId)).thenReturn(Optional.of(existing));
        FoodItem rice = FoodItem.builder().nameVi("Gạo").build();
        ReflectionTestUtils.setField(rice, "id", foodId);
        when(foodItemRepository.findById(foodId)).thenReturn(Optional.of(rice));
        when(dietLogHelper.macrosForFood(rice, BigDecimal.valueOf(150)))
                .thenReturn(MacroNutrients.of(BigDecimal.valueOf(195), null, null, null));
        when(dietPrefCheckService.checkFoodItems(any(), anyList())).thenReturn(List.of());
        when(recipeRepository.save(any(UserRecipe.class))).thenAnswer(inv -> inv.getArgument(0));

        RecipeRequest request = new RecipeRequest();
        request.setName("Cơm mới");
        RecipeRequest.RecipeIngredientRequest ing = new RecipeRequest.RecipeIngredientRequest();
        ing.setFoodItemId(foodId);
        ing.setGram(BigDecimal.valueOf(150));
        request.setIngredients(List.of(ing));

        var response = userRecipeService.update(userId, recipeId, request);
        assertEquals(0, response.getTotalCalories().compareTo(BigDecimal.valueOf(195)));
        assertEquals("Cơm mới", response.getName());
    }
}
