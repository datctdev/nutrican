package com.sba.nutricanbe.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class FoodPredictionDto {

    @JsonProperty("food_code")
    private String foodCode;

    @JsonProperty("food_name")
    private String foodName;

    private double confidence;
}
