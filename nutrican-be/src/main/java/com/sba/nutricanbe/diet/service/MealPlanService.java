package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.diet.controller.MealPlanController.MealPlanItemRequest;
import com.sba.nutricanbe.diet.controller.MealPlanController.MealPlanRequest;
import com.sba.nutricanbe.diet.dto.MealPlanSaveResult;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanItem;

import java.util.List;
import java.util.UUID;

public interface MealPlanService {
    MealPlanSaveResult createPlan(UUID ptId, MealPlanRequest request);
    MealPlanSaveResult updatePlan(UUID ptId, UUID clientId, MealPlanRequest request);
    List<MealPlanItem> saveItems(UUID mealPlanId, List<MealPlanItemRequest> itemRequests);
}
