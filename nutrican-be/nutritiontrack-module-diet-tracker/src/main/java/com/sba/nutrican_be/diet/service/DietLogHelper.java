package com.sba.nutrican_be.diet.service;

import com.sba.nutrican_be.ai.dto.MealRecognitionResult;
import com.sba.nutrican_be.core.dto.MacroNutrients;
import com.sba.nutrican_be.core.entity.DietLog;
import com.sba.nutrican_be.core.entity.DietLogItem;
import com.sba.nutrican_be.core.entity.FoodItem;
import com.sba.nutrican_be.core.entity.PtClientMapping;
import com.sba.nutrican_be.core.enums.MealSource;
import com.sba.nutrican_be.core.enums.MealType;
import com.sba.nutrican_be.diet.dto.DietLogItemRequest;
import com.sba.nutrican_be.diet.dto.DietLogResponse;

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
