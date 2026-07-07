package com.sba.nutricanbe.ai.service;

import com.sba.nutricanbe.ai.dto.MealRecognitionResult;
import com.sba.nutricanbe.ai.dto.ResNetAnalyzeResponse;
import org.springframework.web.multipart.MultipartFile;

public interface MealRecognitionService {

    MealRecognitionResult recognizeMeal(String imageUrl, String mealType);

    MealRecognitionResult recognizeMealFromFile(MultipartFile file, String mealType);

    MealRecognitionResult recognizeMealFromFile(MultipartFile file, String mealType, String mealSource, String mealComplexity);

    MealRecognitionResult recognizeMealFromFile(
            MultipartFile file, String mealType, String mealSource, String mealComplexity,
            ResNetAnalyzeResponse cachedResNet);

    boolean isAvailable();

    String getModelName();

    String getPromptVersionHash();
}

