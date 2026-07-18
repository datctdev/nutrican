package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.ai.catalog.ResNetFoodCodeMapping;
import com.sba.nutricanbe.diet.dto.PlanDietPrefWarning;
import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.diet.enums.DietTag;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.diet.service.DietPrefCheckService;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.DietPreference;
import com.sba.nutricanbe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DietPrefCheckServiceImpl implements DietPrefCheckService {

    private final UserRepository userRepository;
    private final FoodItemRepository foodItemRepository;

    @Override
    public boolean matchesPreference(DietPreference preference, List<String> dietTags) {
        if (preference == null || preference == DietPreference.NORMAL) {
            return true;
        }
        if (dietTags == null || dietTags.isEmpty()) {
            return true;
        }
        return switch (preference) {
            case VEGAN -> dietTags.contains(DietTag.VEGAN.name());
            case VEGETARIAN -> dietTags.contains(DietTag.VEGETARIAN.name()) || dietTags.contains(DietTag.VEGAN.name());
            case KETO -> dietTags.contains(DietTag.KETO.name());
            case EAT_CLEAN -> dietTags.contains(DietTag.EAT_CLEAN.name());
            default -> true;
        };
    }

    @Override
    public boolean hasMismatch(UUID userId, String foodCode) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getDietPreference() == null || user.getDietPreference() == DietPreference.NORMAL) {
            return false;
        }
        List<String> tags = resolveTags(foodCode);
        return !matchesPreference(user.getDietPreference(), tags);
    }

    @Override
    public String buildWarningMessage(DietPreference preference, String foodName) {
        String pref = preference != null ? preference.name() : "NORMAL";
        return "Món \"" + (foodName != null ? foodName : "này") + "\" có thể không phù hợp chế độ ăn " + pref;
    }

    @Override
    public List<PlanDietPrefWarning> checkPlan(UUID clientId, List<String> foodCodes) {
        User user = userRepository.findById(clientId).orElse(null);
        if (user == null || user.getDietPreference() == null || user.getDietPreference() == DietPreference.NORMAL) {
            return List.of();
        }
        if (foodCodes == null || foodCodes.isEmpty()) {
            return List.of();
        }

        List<PlanDietPrefWarning> warnings = new ArrayList<>();
        for (int i = 0; i < foodCodes.size(); i++) {
            String code = foodCodes.get(i);
            if (code == null || code.isBlank()) {
                continue;
            }
            List<String> tags = resolveTags(code);
            if (!matchesPreference(user.getDietPreference(), tags)) {
                String name = ResNetFoodCodeMapping.catalogNameViOrDisplay(code, code);
                warnings.add(PlanDietPrefWarning.builder()
                        .itemIndex(i)
                        .foodCode(code)
                        .message(buildWarningMessage(user.getDietPreference(), name))
                        .build());
            }
        }
        return warnings;
    }

    @Override
    public List<PlanDietPrefWarning> checkFoodItems(UUID userId, List<FoodItem> foods) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getDietPreference() == null || user.getDietPreference() == DietPreference.NORMAL) {
            return List.of();
        }
        if (foods == null || foods.isEmpty()) {
            return List.of();
        }
        List<PlanDietPrefWarning> warnings = new ArrayList<>();
        for (int i = 0; i < foods.size(); i++) {
            FoodItem food = foods.get(i);
            if (food == null) {
                continue;
            }
            List<String> tags = food.getDietTags() != null ? food.getDietTags() : List.of();
            if (!matchesPreference(user.getDietPreference(), tags)) {
                warnings.add(PlanDietPrefWarning.builder()
                        .itemIndex(i)
                        .foodCode(food.getId() != null ? food.getId().toString() : null)
                        .message(buildWarningMessage(user.getDietPreference(), food.getNameVi()))
                        .build());
            }
        }
        return warnings;
    }

    public List<String> resolveTags(String foodCode) {
        if (foodCode == null || foodCode.isBlank()) {
            return List.of();
        }
        return findFoodByCode(foodCode)
                .map(FoodItem::getDietTags)
                .filter(tags -> tags != null && !tags.isEmpty())
                .orElse(List.of());
    }

    private Optional<FoodItem> findFoodByCode(String foodCode) {
        String code = foodCode.trim().toLowerCase(Locale.ROOT);
        return foodItemRepository.findAll().stream()
                .filter(f -> f.getAliases() != null && f.getAliases().stream()
                        .anyMatch(a -> code.equals(a.toLowerCase(Locale.ROOT))))
                .findFirst();
    }
}
