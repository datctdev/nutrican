package com.sba.nutrican_be.ai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.math.BigDecimal;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class MealRecognitionService {

    private final OllamaService ollamaService;
    private final WebClient webClient;

    @Value("${ai.ollama.default-model}")
    private String defaultModel;

    private static final BigDecimal LOW_CONFIDENCE_THRESHOLD = BigDecimal.valueOf(0.6);

    public MealRecognitionResult recognizeMeal(String imageUrl, String mealType) {
        if (!ollamaService.isAvailable()) {
            log.warn("Ollama not available, using fallback");
            return createFallbackResult("AI service unavailable");
        }

        try {
            Map<String, Object> requestBody = buildVisionRequest(imageUrl);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = webClient.post()
                    .uri("/api/generate")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            MealRecognitionResult result = parseOllamaResponse(response);

            if (result.getConfidenceScore() != null &&
                result.getConfidenceScore().compareTo(LOW_CONFIDENCE_THRESHOLD) < 0) {
                result.setFallback(true);
                result.setMessage("Low confidence, please verify macros manually");
                log.info("Low confidence score: {}, triggering fallback", result.getConfidenceScore());
            }

            return result;
        } catch (Exception e) {
            log.error("Meal recognition failed: {}", e.getMessage());
            return createFallbackResult("Recognition failed: " + e.getMessage());
        }
    }

    private Map<String, Object> buildVisionRequest(String imageUrl) {
        String prompt = """
            Analyze this food image and provide nutritional information in JSON format.
            Return ONLY valid JSON with these fields:
            - foodName: name of the dish/food
            - portionSize: estimated portion size as a number
            - portionUnit: unit of measurement (g, ml, piece, bowl, etc.)
            - calories: estimated calories
            - protein: protein in grams
            - carb: carbohydrates in grams
            - fat: fat in grams
            - confidenceScore: your confidence as a decimal between 0 and 1

            Example response:
            {"foodName":"Grilled Chicken Salad","portionSize":300,"portionUnit":"g","calories":350,"protein":30,"carb":15,"fat":18,"confidenceScore":0.85}
            """;

        Map<String, Object> message = new HashMap<>();
        message.put("role", "user");
        message.put("content", prompt + "\n\nImage URL: " + imageUrl);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", defaultModel);
        requestBody.put("messages", List.of(message));
        requestBody.put("stream", false);
        requestBody.put("format", "json");

        return requestBody;
    }

    private MealRecognitionResult parseOllamaResponse(Map<String, Object> response) {
        try {
            Object responseObj = response.get("response");
            if (responseObj == null) {
                return createFallbackResult("Empty response from AI");
            }

            String jsonStr = responseObj.toString();
            jsonStr = jsonStr.replaceAll("[\\n\\r]", "").trim();

            if (jsonStr.startsWith("```json")) jsonStr = jsonStr.substring(7);
            if (jsonStr.startsWith("```")) jsonStr = jsonStr.substring(3);
            if (jsonStr.endsWith("```")) jsonStr = jsonStr.substring(0, jsonStr.length() - 3);
            jsonStr = jsonStr.trim();

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            Map<String, Object> data = mapper.readValue(jsonStr, Map.class);

            return MealRecognitionResult.builder()
                    .foodName((String) data.getOrDefault("foodName", "Unknown"))
                    .portionSize(toBigDecimal(data.get("portionSize")))
                    .portionUnit((String) data.getOrDefault("portionUnit", "g"))
                    .calories(toBigDecimal(data.get("calories")))
                    .protein(toBigDecimal(data.get("protein")))
                    .carb(toBigDecimal(data.get("carb")))
                    .fat(toBigDecimal(data.get("fat")))
                    .confidenceScore(toBigDecimal(data.get("confidenceScore")))
                    .fallback(false)
                    .build();
        } catch (Exception e) {
            log.error("Failed to parse AI response: {}", e.getMessage());
            return createFallbackResult("Parse error: " + e.getMessage());
        }
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal) return (BigDecimal) value;
        if (value instanceof Number) return BigDecimal.valueOf(((Number) value).doubleValue());
        try { return new BigDecimal(value.toString()); } catch (Exception e) { return BigDecimal.ZERO; }
    }

    private MealRecognitionResult createFallbackResult(String message) {
        return MealRecognitionResult.builder()
                .foodName("Manual Entry Required")
                .calories(BigDecimal.ZERO)
                .protein(BigDecimal.ZERO)
                .carb(BigDecimal.ZERO)
                .fat(BigDecimal.ZERO)
                .confidenceScore(BigDecimal.ZERO)
                .fallback(true)
                .message(message)
                .build();
    }
}
