package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.diet.dto.PlanAllergyWarning;
import com.sba.nutricanbe.diet.enums.AllergenType;

import java.util.List;
import java.util.UUID;

public interface AllergyCheckService {
    List<AllergenType> checkFoodCode(UUID userId, String foodCode);
    List<AllergenType> checkFoodItems(UUID userId, List<UUID> foodItemIds);
    List<PlanAllergyWarning> checkPlan(UUID clientId, List<String> foodCodes);
}
