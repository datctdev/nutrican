package com.sba.nutrican_be.ai;

import com.sba.nutrican_be.ai.service.MealRecognitionService;
import com.sba.nutrican_be.ai.service.NutritionChatbotService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai")
public class AiController {

    private final MealRecognitionService mealRecognitionService;
    private final NutritionChatbotService nutritionChatbotService;

    public AiController(MealRecognitionService mealRecognitionService,
                        NutritionChatbotService nutritionChatbotService) {
        this.mealRecognitionService = mealRecognitionService;
        this.nutritionChatbotService = nutritionChatbotService;
    }
}
