package com.sba.nutricanbe.workspace.repository;

import com.sba.nutricanbe.workspace.entity.MealPlanTemplateItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MealPlanTemplateItemRepository extends JpaRepository<MealPlanTemplateItem, UUID> {
    List<MealPlanTemplateItem> findByTemplateIdOrderByDayOffsetAscMealTypeAsc(UUID templateId);
    void deleteByTemplateId(UUID templateId);
}
