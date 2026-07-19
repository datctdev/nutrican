package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.diet.dto.request.DietLogItemRequest;
import com.sba.nutricanbe.diet.dto.request.RecipeRequest;
import com.sba.nutricanbe.diet.dto.response.RecipeResponse;

import java.util.List;
import java.util.UUID;

public interface UserRecipeService {
    RecipeResponse create(UUID userId, RecipeRequest request);
    RecipeResponse update(UUID userId, UUID recipeId, RecipeRequest request);
    List<RecipeResponse> list(UUID userId);
    RecipeResponse get(UUID userId, UUID recipeId);
    List<DietLogItemRequest> toLogItems(UUID userId, UUID recipeId);
}
