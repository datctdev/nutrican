package com.sba.nutricanbe.diet.repository;

import com.sba.nutricanbe.diet.entity.MealPlanItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MealPlanItemRepository extends JpaRepository<MealPlanItem, UUID> {
    List<MealPlanItem> findByMealPlanIdOrderByPlanDateAscMealTypeAsc(UUID mealPlanId);
    void deleteByMealPlanId(UUID mealPlanId);
}
