package com.sba.nutricanbe.workspace.dto;

import com.sba.nutricanbe.diet.enums.PtCorrectionReason;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ReviewActionRequest {
    @NotBlank(message = "action is required")
    private String action;

    @DecimalMin(value = "0", inclusive = true, message = "adjustedCalories must be >= 0")
    @DecimalMax(value = "20000", message = "adjustedCalories exceeds limit")
    private BigDecimal adjustedCalories;

    @DecimalMin(value = "0", inclusive = true, message = "adjustedProtein must be >= 0")
    @DecimalMax(value = "20000", message = "adjustedProtein exceeds limit")
    private BigDecimal adjustedProtein;

    @DecimalMin(value = "0", inclusive = true, message = "adjustedCarb must be >= 0")
    @DecimalMax(value = "20000", message = "adjustedCarb exceeds limit")
    private BigDecimal adjustedCarb;

    @DecimalMin(value = "0", inclusive = true, message = "adjustedFat must be >= 0")
    @DecimalMax(value = "20000", message = "adjustedFat exceeds limit")
    private BigDecimal adjustedFat;

    @Size(max = 255, message = "adjustedFoodDescription max 255 characters")
    private String adjustedFoodDescription;

    private String note;
    private PtCorrectionReason correctionReason;
}
