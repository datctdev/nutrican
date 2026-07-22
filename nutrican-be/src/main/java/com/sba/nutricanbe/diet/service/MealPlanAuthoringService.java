package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.diet.dto.request.MealPlanRequest;
import com.sba.nutricanbe.diet.dto.response.MealPlanDetailResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanSaveResult;

import java.time.LocalDate;
import java.util.UUID;


public interface MealPlanAuthoringService {

    MealPlanSaveResult createPlan(UUID ptId, MealPlanRequest request);

    MealPlanSaveResult updatePlan(UUID ptId, UUID clientId, MealPlanRequest request);

    MealPlanDetailResponse getClientPlan(UUID ptId, UUID clientId, LocalDate weekStart);

    void publishPlan(UUID ptId, UUID planId);
}
