package com.sba.nutricanbe.diet.dto;

import com.sba.nutricanbe.diet.enums.AllergenType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlanAllergyWarning {
    private int itemIndex;
    private String foodCode;
    private List<AllergenType> matchedAllergens;
}
