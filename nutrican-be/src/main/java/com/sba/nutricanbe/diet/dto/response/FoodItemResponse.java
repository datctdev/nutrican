package com.sba.nutricanbe.diet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodItemResponse {
    private UUID id;
    private String nameVi;
    private String nameEn;
    private String foodCode;
    private List<String> aliases;
    private String category;
    /** SoT group: PROTEIN | CARB | FAT | VEG | FRUIT | OTHER */
    private String categoryGroup;
    private String categoryGroupLabel;
    private BigDecimal servingSizeG;
    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carb;
    private BigDecimal fat;
    private Integer matchScore;
    private List<String> dietTags;
    private List<String> allergens;
    private Boolean prefMismatch;
}
