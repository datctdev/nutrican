package com.sba.nutrican_be.diet.service;

import com.sba.nutrican_be.diet.dto.FoodItemResponse;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FoodCatalogService {

    List<FoodItemResponse> search(String query, String category);

    FoodItemResponse getById(UUID id);

    List<FoodItemResponse> getHotpotBroths();

    List<FoodItemResponse> getHotpotItems();

    Optional<FoodItemResponse> findBestMatch(String foodName);

    List<FoodItemResponse> findMatches(String foodName, int limit);

    int getMatchScore(String foodName, UUID foodItemId);
}
