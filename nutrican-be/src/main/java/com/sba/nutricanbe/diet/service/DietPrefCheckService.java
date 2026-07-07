package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.diet.dto.PlanDietPrefWarning;
import com.sba.nutricanbe.user.enums.DietPreference;

import java.util.List;
import java.util.UUID;

public interface DietPrefCheckService {

    boolean matchesPreference(DietPreference preference, List<String> dietTags);

    boolean hasMismatch(UUID userId, String foodCode);

    String buildWarningMessage(DietPreference preference, String foodName);

    List<PlanDietPrefWarning> checkPlan(UUID clientId, List<String> foodCodes);

    List<PlanDietPrefWarning> checkFoodItems(UUID userId, List<com.sba.nutricanbe.diet.entity.FoodItem> foods);
}
