package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.diet.dto.request.FoodTagUpdateRequest;
import com.sba.nutricanbe.diet.dto.response.FoodTagDto;

import java.util.List;

public interface FoodDietTagService {

    List<FoodTagDto> listTaggedFoods();

    FoodTagDto updateTags(String foodCode, FoodTagUpdateRequest request);
}
