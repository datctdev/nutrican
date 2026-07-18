package com.sba.nutricanbe.workspace.repository;

import com.sba.nutricanbe.workspace.entity.MealPlanTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MealPlanTemplateRepository extends JpaRepository<MealPlanTemplate, UUID> {
    List<MealPlanTemplate> findByPtIdOrderByCreatedAtDesc(UUID ptId);

    Optional<MealPlanTemplate> findByPtIdAndName(UUID ptId, String name);
}
