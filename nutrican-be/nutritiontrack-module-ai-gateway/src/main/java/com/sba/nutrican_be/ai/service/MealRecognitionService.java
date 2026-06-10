package com.sba.nutrican_be.ai.service;

import com.sba.nutrican_be.ai.MealRecognitionResult;
import org.springframework.web.multipart.MultipartFile;

public interface MealRecognitionService {

    MealRecognitionResult recognizeMeal(String imageUrl, String mealType);

    MealRecognitionResult recognizeMealFromFile(MultipartFile file, String mealType);

    MealRecognitionResult recognizeMealFromFile(MultipartFile file, String mealType, String mealSource, String mealComplexity);

    boolean isAvailable();

    String getModelName();

    String getPromptVersionHash();
}
