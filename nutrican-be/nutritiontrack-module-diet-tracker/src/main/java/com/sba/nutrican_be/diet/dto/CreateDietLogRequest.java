package com.sba.nutrican_be.diet.dto;

import com.sba.nutrican_be.core.enums.MealType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateDietLogRequest {
    private MealType mealType;
    private String foodDescription;
    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;
    private LocalDate logDate;
}
