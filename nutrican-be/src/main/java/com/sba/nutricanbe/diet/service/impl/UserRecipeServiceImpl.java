package com.sba.nutricanbe.diet.service.impl;


import com.sba.nutricanbe.common.exception.BadRequestException;

import com.sba.nutricanbe.common.exception.ResourceNotFoundException;

import com.sba.nutricanbe.common.util.MacroUtils;

import com.sba.nutricanbe.diet.dto.request.DietLogItemRequest;
import com.sba.nutricanbe.diet.dto.request.RecipeRequest;
import com.sba.nutricanbe.diet.dto.response.PlanDietPrefWarning;
import com.sba.nutricanbe.diet.dto.response.RecipeResponse;
import com.sba.nutricanbe.diet.entity.FoodItem;

import com.sba.nutricanbe.diet.entity.UserRecipe;

import com.sba.nutricanbe.diet.entity.UserRecipeIngredient;

import com.sba.nutricanbe.diet.enums.MealSource;

import com.sba.nutricanbe.diet.repository.FoodItemRepository;

import com.sba.nutricanbe.diet.repository.UserRecipeRepository;

import com.sba.nutricanbe.diet.service.DietLogHelper;

import com.sba.nutricanbe.diet.service.DietPrefCheckService;

import com.sba.nutricanbe.diet.service.UserRecipeService;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;


import java.math.BigDecimal;

import java.math.RoundingMode;

import java.util.ArrayList;

import java.util.List;

import java.util.UUID;


@Service

@RequiredArgsConstructor

public class UserRecipeServiceImpl implements UserRecipeService {


    private final UserRecipeRepository recipeRepository;

    private final FoodItemRepository foodItemRepository;

    private final DietLogHelper dietLogHelper;

    private final DietPrefCheckService dietPrefCheckService;


    @Override

    @Transactional

    public RecipeResponse create(UUID userId, RecipeRequest request) {

        validateRequest(request);

        UserRecipe recipe = UserRecipe.builder()

                .userId(userId)

                .name(request.getName().trim())

                .mealSource(MealSource.HOME_COOKED)

                .build();

        BuildResult built = buildIngredients(recipe, request.getIngredients());

        recipe.setIngredients(built.ingredients());

        recipe.setTotalCalories(built.totalCal().setScale(1, RoundingMode.HALF_UP));

        recipe.setTotalProtein(built.totalPro().setScale(1, RoundingMode.HALF_UP));

        recipe.setTotalCarb(built.totalCarb().setScale(1, RoundingMode.HALF_UP));

        recipe.setTotalFat(built.totalFat().setScale(1, RoundingMode.HALF_UP));

        UserRecipe saved = recipeRepository.save(recipe);

        return toResponse(saved, built.foods());

 }
    @Override

    @Transactional

    public RecipeResponse update(UUID userId, UUID recipeId, RecipeRequest request) {

        validateRequest(request);

        UserRecipe recipe = recipeRepository.findById(recipeId)

                .orElseThrow(() -> new ResourceNotFoundException("UserRecipe", recipeId));

        if (!recipe.getUserId().equals(userId)) {

            throw new BadRequestException("Not your recipe");

        }

        recipe.setName(request.getName().trim());

        BuildResult built = buildIngredients(recipe, request.getIngredients());

        recipe.getIngredients().clear();

        recipe.getIngredients().addAll(built.ingredients());

        recipe.setTotalCalories(built.totalCal().setScale(1, RoundingMode.HALF_UP));

        recipe.setTotalProtein(built.totalPro().setScale(1, RoundingMode.HALF_UP));

        recipe.setTotalCarb(built.totalCarb().setScale(1, RoundingMode.HALF_UP));

        recipe.setTotalFat(built.totalFat().setScale(1, RoundingMode.HALF_UP));

        return toResponse(recipeRepository.save(recipe), built.foods());

    }


    @Override

    @Transactional(readOnly = true)

    public List<RecipeResponse> list(UUID userId) {

        return recipeRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream()

                .map(r -> toResponse(r, loadFoods(r)))

                .toList();

    }


    @Override

    @Transactional(readOnly = true)

    public RecipeResponse get(UUID userId, UUID recipeId) {

        UserRecipe recipe = recipeRepository.findById(recipeId)

                .orElseThrow(() -> new ResourceNotFoundException("UserRecipe", recipeId));

        if (!recipe.getUserId().equals(userId)) {

            throw new BadRequestException("Not your recipe");

        }

        return toResponse(recipe, loadFoods(recipe));

    }


    @Override

    @Transactional(readOnly = true)

    public List<DietLogItemRequest> toLogItems(UUID userId, UUID recipeId) {

        UserRecipe recipe = recipeRepository.findById(recipeId)

                .orElseThrow(() -> new ResourceNotFoundException("UserRecipe", recipeId));

        if (!recipe.getUserId().equals(userId)) {

            throw new BadRequestException("Not your recipe");

        }

        return recipe.getIngredients().stream().map(ing -> {

            DietLogItemRequest req = new DietLogItemRequest();

            req.setFoodItemId(ing.getFoodItemId());

            req.setQuantityG(ing.getGram());

            return req;

        }).toList();

    }


    private void validateRequest(RecipeRequest request) {

        if (request.getName() == null || request.getName().isBlank()) {

            throw new BadRequestException("Recipe name is required");

        }

        if (request.getIngredients() == null || request.getIngredients().isEmpty()) {

            throw new BadRequestException("At least one ingredient required");

        }

    }


    private BuildResult buildIngredients(UserRecipe recipe, List<RecipeRequest.RecipeIngredientRequest> requests) {

        BigDecimal totalCal = MacroUtils.ZERO, totalPro = MacroUtils.ZERO, totalCarb = MacroUtils.ZERO, totalFat = MacroUtils.ZERO;

        List<UserRecipeIngredient> ingredients = new ArrayList<>();

        List<FoodItem> foods = new ArrayList<>();

        for (RecipeRequest.RecipeIngredientRequest req : requests) {

            FoodItem food = foodItemRepository.findById(req.getFoodItemId())

                    .orElseThrow(() -> new ResourceNotFoundException("FoodItem", req.getFoodItemId()));

            foods.add(food);

            var macros = dietLogHelper.macrosForFood(food, req.getGram());

            UserRecipeIngredient ing = UserRecipeIngredient.builder()

                    .recipe(recipe)

                    .foodItemId(food.getId())

                    .gram(req.getGram())

                    .itemName(food.getNameVi())

                    .calories(macros.calories())

                    .protein(macros.protein())

                    .carb(macros.carbs())

                    .fat(macros.fat())

                    .build();

            ingredients.add(ing);

            totalCal = MacroUtils.add(totalCal, macros.calories());

            totalPro = MacroUtils.add(totalPro, macros.protein());

            totalCarb = MacroUtils.add(totalCarb, macros.carbs());

            totalFat = MacroUtils.add(totalFat, macros.fat());

        }

        return new BuildResult(ingredients, foods, totalCal, totalPro, totalCarb, totalFat);

    }


    private List<FoodItem> loadFoods(UserRecipe recipe) {

        if (recipe.getIngredients() == null) {

            return List.of();

        }

        return recipe.getIngredients().stream()

                .map(ing -> foodItemRepository.findById(ing.getFoodItemId()).orElse(null))

                .filter(f -> f != null)

                .toList();

    }


    private RecipeResponse toResponse(UserRecipe recipe, List<FoodItem> foods) {

        List<PlanDietPrefWarning> prefWarnings = dietPrefCheckService.checkFoodItems(recipe.getUserId(), foods);

        return RecipeResponse.builder()

                .id(recipe.getId())

                .name(recipe.getName())

                .totalCalories(recipe.getTotalCalories())

                .totalProtein(recipe.getTotalProtein())

                .totalCarb(recipe.getTotalCarb())

                .totalFat(recipe.getTotalFat())

                .dietPrefWarnings(prefWarnings.isEmpty() ? null : prefWarnings)

                .ingredients(recipe.getIngredients().stream().map(ing ->

                        RecipeResponse.RecipeIngredientResponse.builder()

                                .foodItemId(ing.getFoodItemId())

                                .itemName(ing.getItemName())

                                .gram(ing.getGram())

                                .calories(ing.getCalories())

                                .protein(ing.getProtein())

                                .carb(ing.getCarb())

                                .fat(ing.getFat())

                                .build()).toList())

                .build();

    }


    private record BuildResult(List<UserRecipeIngredient> ingredients, List<FoodItem> foods,

                               BigDecimal totalCal, BigDecimal totalPro, BigDecimal totalCarb, BigDecimal totalFat) {}

}

