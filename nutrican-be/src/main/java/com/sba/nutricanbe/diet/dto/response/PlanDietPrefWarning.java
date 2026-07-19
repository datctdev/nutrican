package com.sba.nutricanbe.diet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlanDietPrefWarning {
    private int itemIndex;
    private String foodCode;
    private String message;
}
