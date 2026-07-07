package com.sba.nutricanbe.diet.dto;

import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealPlanSaveResult {
    private MealPlan plan;
    private List<MealPlanItem> items;
    private List<PlanAllergyWarning> allergyWarnings;
    private List<PlanDietPrefWarning> dietPrefWarnings;
    private String macroWarning;
}
