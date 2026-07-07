package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.diet.enums.AllergenType;
import lombok.Data;

import java.util.List;

@Data
public class AllergyProfileRequest {
    private List<AllergenType> allergens;
}
