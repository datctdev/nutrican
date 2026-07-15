package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.diet.dto.PlanAllergyWarning;
import java.util.List;
import java.util.UUID;

public interface AllergyCheckService {
    List<String> checkFoodCode(UUID userId, String foodCode);
    List<String> checkFoodItems(UUID userId, List<UUID> foodItemIds);
    List<PlanAllergyWarning> checkPlan(UUID clientId, List<String> foodCodes);
}
