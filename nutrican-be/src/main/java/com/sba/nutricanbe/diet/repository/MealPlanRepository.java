package com.sba.nutricanbe.diet.repository;

import com.sba.nutricanbe.diet.entity.MealPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MealPlanRepository extends JpaRepository<MealPlan, UUID> {
    Optional<MealPlan> findFirstByClientIdAndWeekStartOrderByCreatedAtDesc(UUID clientId, LocalDate weekStart);
    Optional<MealPlan> findFirstByClientIdAndWeekStartAndIsPublishedTrueOrderByCreatedAtDesc(
            UUID clientId, LocalDate weekStart);
    List<MealPlan> findByClientIdOrderByWeekStartDesc(UUID clientId);
    List<MealPlan> findByClientIdAndIsPublishedTrueOrderByWeekStartDesc(UUID clientId);
}
