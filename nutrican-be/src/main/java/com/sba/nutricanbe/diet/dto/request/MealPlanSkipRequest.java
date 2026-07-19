package com.sba.nutricanbe.diet.dto.request;

import lombok.Data;

@Data
public class MealPlanSkipRequest {
    private String skipReason;
    private String skipNote;
}
