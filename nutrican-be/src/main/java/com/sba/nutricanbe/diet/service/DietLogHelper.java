package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.ai.dto.MealRecognitionResult;
import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.DietLogItem;
import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.dto.DietLogItemRequest;
import com.sba.nutricanbe.diet.dto.DietLogResponse;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DietLogHelper {
    void applyItemsToLog(DietLog dietLog, List<DietLogItemRequest> itemRequests);
    DietLogItem buildLogItem(DietLog dietLog, DietLogItemRequest req);
    MacroNutrients macrosForFood(FoodItem food, BigDecimal quantityG);
    BigDecimal scale(BigDecimal value, BigDecimal ratio);
    void assignPtReviewerIfNeeded(DietLog dietLog, UUID customerId);
    Optional<PtClientMapping> findActivePt(UUID customerId);
    void notifyPtOfNewLog(DietLog dietLog);
    MealType parseMealType(String mealTypeStr);
    boolean shouldSuggestSos(MealSource mealSource, MealRecognitionResult aiResult, boolean hasDbMatch);
    DietLogResponse toResponse(DietLog dietLog);
}
