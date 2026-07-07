package com.sba.nutricanbe.diet.repository;

import com.sba.nutricanbe.diet.entity.MealPlanSuggestion;
import com.sba.nutricanbe.diet.enums.MealPlanSuggestionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MealPlanSuggestionRepository extends JpaRepository<MealPlanSuggestion, UUID> {
    List<MealPlanSuggestion> findByCustomerIdAndStatus(UUID customerId, MealPlanSuggestionStatus status);
    List<MealPlanSuggestion> findByStatus(MealPlanSuggestionStatus status);
}
