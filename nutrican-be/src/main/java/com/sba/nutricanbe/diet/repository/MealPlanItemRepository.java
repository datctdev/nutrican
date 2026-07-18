package com.sba.nutricanbe.diet.repository;

import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.enums.MealType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface MealPlanItemRepository extends JpaRepository<MealPlanItem, UUID> {
    List<MealPlanItem> findByMealPlanIdOrderByPlanDateAscMealTypeAsc(UUID mealPlanId);
    List<MealPlanItem> findByMealPlanIdAndPlanDateAndMealType(
            UUID mealPlanId, LocalDate planDate, MealType mealType);
    void deleteByMealPlanId(UUID mealPlanId);
}
