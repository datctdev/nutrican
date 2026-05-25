package com.sba.nutrican_be.ai.service;

import com.sba.nutrican_be.ai.MealRecognitionResult;

public interface MealRecognitionService {

    MealRecognitionResult recognizeMeal(String imageUrl, String mealType);
}
