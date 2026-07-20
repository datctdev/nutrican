package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class MealPlanItemMacrosResolver {

    private final FoodCatalogService foodCatalogService;
    private final FoodItemRepository foodItemRepository;
    private final DietLogHelper dietLogHelper;

    public MacroNutrients resolve(MealPlanItem item) {
        if (item == null) {
            return null;
        }
        BigDecimal qty = item.getPortionGrams();
        MacroNutrients macros = resolveByFoodCode(item.getFoodCode(), qty);
        if (macros == null && item.getFoodItemId() != null) {
            macros = foodItemRepository.findById(item.getFoodItemId())
                    .map(f -> dietLogHelper.macrosForFood(f, qty != null ? qty : f.getServingSizeG()))
                    .orElse(null);
        }
        return macros;
    }

    private MacroNutrients resolveByFoodCode(String foodCode, BigDecimal qty) {
        if (foodCode == null || foodCode.isBlank()) {
            return null;
        }
        try {
            return foodCatalogService.findByResNetFoodCode(foodCode.trim().toLowerCase())
                    .flatMap(r -> {
                        if (r.getId() == null) {
                            return Optional.<MacroNutrients>empty();
                        }
                        Optional<FoodItem> food = foodItemRepository.findById(r.getId());
                        return food.map(f -> dietLogHelper.macrosForFood(
                                f, qty != null ? qty : f.getServingSizeG()));
                    })
                    .orElse(null);
        } catch (Exception ignored) {
            return null;
        }
    }
}
