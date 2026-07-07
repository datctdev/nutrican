package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.NutritionGoal;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ClientGoalRequest {
    private NutritionGoal nutritionGoal;
    private BigDecimal targetWeight;
    private BigDecimal baselineWeight;
    private LocalDate targetDate;
    private Integer trimester;
}
