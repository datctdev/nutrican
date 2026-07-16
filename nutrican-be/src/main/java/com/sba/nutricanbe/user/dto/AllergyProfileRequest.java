package com.sba.nutricanbe.user.dto;

import lombok.Data;

import java.util.List;

@Data
public class AllergyProfileRequest {
    private List<String> foodCodes;
}
