package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.diet.dto.PlanAllergyWarning;
import com.sba.nutricanbe.diet.entity.FoodAllergenMapping;
import com.sba.nutricanbe.diet.enums.AllergenType;
import com.sba.nutricanbe.diet.repository.FoodAllergenMappingRepository;
import com.sba.nutricanbe.diet.service.AllergyCheckService;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AllergyCheckServiceImpl implements AllergyCheckService {

    private final UserRepository userRepository;
    private final FoodAllergenMappingRepository allergenMappingRepository;

    @Override
    public List<AllergenType> checkFoodCode(UUID userId, String foodCode) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getAllergens() == null || user.getAllergens().isEmpty()) {
            return List.of();
        }
        if (foodCode == null || foodCode.isBlank()) {
            return List.of();
        }
        List<AllergenType> foodAllergens = allergenMappingRepository.findByFoodCode(foodCode.toLowerCase())
                .map(FoodAllergenMapping::getAllergens)
                .orElse(List.of());
        List<AllergenType> matches = new ArrayList<>();
        for (AllergenType a : user.getAllergens()) {
            if (foodAllergens.contains(a)) {
                matches.add(a);
            }
        }
        return matches;
    }

    @Override
    public List<AllergenType> checkFoodItems(UUID userId, List<UUID> foodItemIds) {
        if (foodItemIds == null || foodItemIds.isEmpty()) {
            return List.of();
        }
        java.util.LinkedHashSet<AllergenType> merged = new java.util.LinkedHashSet<>();
        for (UUID foodItemId : foodItemIds) {
            merged.addAll(checkFoodCode(userId, foodItemId != null ? foodItemId.toString() : null));
        }
        return new ArrayList<>(merged);
    }

    @Override
    public List<PlanAllergyWarning> checkPlan(UUID clientId, List<String> foodCodes) {
        if (foodCodes == null || foodCodes.isEmpty()) {
            return List.of();
        }
        List<PlanAllergyWarning> warnings = new ArrayList<>();
        for (int i = 0; i < foodCodes.size(); i++) {
            String code = foodCodes.get(i);
            List<AllergenType> matches = checkFoodCode(clientId, code);
            if (!matches.isEmpty()) {
                warnings.add(PlanAllergyWarning.builder()
                        .itemIndex(i)
                        .foodCode(code)
                        .matchedAllergens(matches)
                        .build());
            }
        }
        return warnings;
    }
}
