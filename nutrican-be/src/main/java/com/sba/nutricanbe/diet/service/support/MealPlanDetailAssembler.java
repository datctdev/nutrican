package com.sba.nutricanbe.diet.service.support;

import com.sba.nutricanbe.diet.dto.response.MealPlanDetailResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanItemResponse;
import com.sba.nutricanbe.diet.dto.response.MealPlanResponse;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.service.DietPrefCheckService;
import com.sba.nutricanbe.diet.service.MealPlanItemMacrosResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;


@Component
@RequiredArgsConstructor
public class MealPlanDetailAssembler {

    private final MealPlanItemRepository mealPlanItemRepository;
    private final MealPlanItemMacrosResolver mealPlanItemMacrosResolver;
    private final DietPrefCheckService dietPrefCheckService;

    public MealPlanDetailResponse buildDetail(MealPlan plan, UUID clientId) {
        List<MealPlanItem> items = mealPlanItemRepository
                .findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId());
        List<String> foodCodes = items.stream()
                .map(MealPlanItem::getFoodCode)
                .filter(code -> code != null && !code.isBlank())
                .toList();
        return new MealPlanDetailResponse(
                MealPlanResponse.from(plan),
                items.stream()
                        .map(i -> MealPlanItemResponse.from(i, mealPlanItemMacrosResolver.resolve(i)))
                        .toList(),
                dietPrefCheckService.checkPlan(clientId, foodCodes));
    }
}
