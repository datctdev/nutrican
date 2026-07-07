package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.diet.dto.RecipeRequest;
import com.sba.nutricanbe.diet.dto.RecipeResponse;

import java.util.List;
import java.util.UUID;

public interface UserRecipeService {
    RecipeResponse create(UUID userId, RecipeRequest request);
    RecipeResponse update(UUID userId, UUID recipeId, RecipeRequest request);
    List<RecipeResponse> list(UUID userId);
    RecipeResponse get(UUID userId, UUID recipeId);
    List<com.sba.nutricanbe.diet.dto.DietLogItemRequest> toLogItems(UUID userId, UUID recipeId);
}
