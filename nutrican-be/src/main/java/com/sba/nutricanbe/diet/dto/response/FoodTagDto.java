package com.sba.nutricanbe.diet.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class FoodTagDto {
    private UUID foodItemId;
    private String foodCode;
    private String nameVi;
    private List<String> dietTags;
}
