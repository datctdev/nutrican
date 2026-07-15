package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.diet.dto.PlanAllergyWarning;
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

    @Override
    public List<String> checkFoodCode(UUID userId, String foodCode) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getAllergicFoodCodes() == null || user.getAllergicFoodCodes().isEmpty()) {
            return List.of();
        }
        if (foodCode == null || foodCode.isBlank()) {
            return List.of();
        }
        if (user.getAllergicFoodCodes().contains(foodCode.toLowerCase()) || 
            user.getAllergicFoodCodes().contains(foodCode)) {
            return List.of(foodCode);
        }
        return List.of();
    }

    @Override
    public List<String> checkFoodItems(UUID userId, List<UUID> foodItemIds) {
        if (foodItemIds == null || foodItemIds.isEmpty()) {
            return List.of();
        }
        java.util.LinkedHashSet<String> merged = new java.util.LinkedHashSet<>();
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
            List<String> matches = checkFoodCode(clientId, code);
            if (!matches.isEmpty()) {
                warnings.add(PlanAllergyWarning.builder()
                        .itemIndex(i)
                        .foodCode(code)
                        .matchedFoodCodes(matches)
                        .build());
            }
        }
        return warnings;
    }
}
