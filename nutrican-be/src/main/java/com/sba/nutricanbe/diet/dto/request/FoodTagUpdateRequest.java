package com.sba.nutricanbe.diet.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class FoodTagUpdateRequest {
    private List<String> dietTags;
}
