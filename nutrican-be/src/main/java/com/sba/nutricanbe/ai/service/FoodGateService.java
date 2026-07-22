package com.sba.nutricanbe.ai.service;

import com.sba.nutricanbe.ai.dto.FoodGatePreCheckResult;
import com.sba.nutricanbe.ai.dto.MealRecognitionResult;
import com.sba.nutricanbe.diet.enums.FoodGateResult;
import org.springframework.web.multipart.MultipartFile;

public interface FoodGateService {
    FoodGateResult check(MealRecognitionResult aiResult);


    FoodGatePreCheckResult preCheck(MultipartFile file);
}
