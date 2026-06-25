package com.sba.nutricanbe.ai.service;

import com.sba.nutricanbe.ai.dto.MealRecognitionResult;
import org.springframework.web.multipart.MultipartFile;

public interface MealRecognitionService {

    MealRecognitionResult recognizeMeal(String imageUrl, String mealType);

    MealRecognitionResult recognizeMealFromFile(MultipartFile file, String mealType);

    MealRecognitionResult recognizeMealFromFile(MultipartFile file, String mealType, String mealSource, String mealComplexity);

    boolean isAvailable();

    String getModelName();

    String getPromptVersionHash();
}

