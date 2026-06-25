package com.sba.nutricanbe.ai.controller;

import com.sba.nutricanbe.ai.dto.MealRecognitionResult;
import com.sba.nutricanbe.ai.service.MealRecognitionService;
import com.sba.nutricanbe.ai.service.NutritionChatbotService;
import com.sba.nutricanbe.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiController {

    private final MealRecognitionService mealRecognitionService;
    private final NutritionChatbotService nutritionChatbotService;

    /**
     * Analyze meal from uploaded image using AI
     */
    @PostMapping("/analyze")
    public ResponseEntity<ApiResponse<MealRecognitionResult>> analyzeMeal(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "mealType", defaultValue = "LUNCH") String mealType) {
        
        MealRecognitionResult result = mealRecognitionService.recognizeMealFromFile(file, mealType);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * Analyze meal from image URL
     */
    @PostMapping("/analyze-url")
    public ResponseEntity<ApiResponse<MealRecognitionResult>> analyzeMealFromUrl(
            @RequestBody Map<String, String> request) {
        
        String imageUrl = request.get("imageUrl");
        String mealType = request.getOrDefault("mealType", "LUNCH");
        
        MealRecognitionResult result = mealRecognitionService.recognizeMeal(imageUrl, mealType);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * Chat with nutrition chatbot
     */
    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<Map<String, String>>> chat(
            @RequestBody Map<String, String> request) {
        
        String message = request.get("message");
        String context = request.get("context");
        
        String response = nutritionChatbotService.chat(message, context);
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", response)));
    }

    /**
     * Check AI service health
     */
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, Object>>> health() {
        boolean available = mealRecognitionService.isAvailable();
        String model = mealRecognitionService.getModelName();
        
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "available", available,
                "model", model
        )));
    }
}


