package com.sba.nutricanbe.workspace.service.support;

import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.entity.MealPlanSuggestion;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.workspace.dto.MealPlanSuggestionDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MealPlanSuggestionMapper {

    private final MealPlanItemRepository mealPlanItemRepository;

    public MealPlanSuggestionDto toDto(MealPlanSuggestion s) {
        MealPlanItem item = mealPlanItemRepository.findById(s.getMealPlanItemId()).orElse(null);
        return MealPlanSuggestionDto.builder()
                .id(s.getId())
                .mealPlanItemId(s.getMealPlanItemId())
                .originalFoodCode(s.getOriginalFoodCode())
                .originalFoodName(s.getOriginalFoodName())
                .originalGram(s.getOriginalGram())
                .suggestedFoodCode(s.getSuggestedFoodCode())
                .suggestedFoodName(s.getSuggestedFoodName())
                .suggestedGram(s.getSuggestedGram())
                .requestReason(s.getRequestReason())
                .customerNote(s.getCustomerNote())
                .ptNote(s.getPtNote())
                .planDate(item != null ? item.getPlanDate() : null)
                .mealType(item != null && item.getMealType() != null ? item.getMealType().name() : null)
                .status(s.getStatus() != null ? s.getStatus().name() : null)
                .createdAt(s.getCreatedAt())
                .decidedAt(s.getDecidedAt())
                .build();
    }
}
