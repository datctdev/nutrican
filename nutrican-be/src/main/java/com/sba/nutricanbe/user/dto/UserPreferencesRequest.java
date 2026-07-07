package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.DietPreference;
import com.sba.nutricanbe.user.enums.NutritionGoal;
import lombok.Data;

import java.util.Map;

@Data
public class UserPreferencesRequest {
    private DietPreference dietPreference;
    private NutritionGoal nutritionGoal;
    private Integer pregnancyTrimester;
    private Map<String, Boolean> notificationOptIn;
}
