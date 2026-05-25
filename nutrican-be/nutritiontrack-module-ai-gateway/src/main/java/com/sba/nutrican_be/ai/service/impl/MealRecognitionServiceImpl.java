package com.sba.nutrican_be.ai.service.impl;

import com.sba.nutrican_be.ai.MealRecognitionResult;
import com.sba.nutrican_be.ai.service.MealRecognitionService;
import com.sba.nutrican_be.ai.service.OllamaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MealRecognitionServiceImpl implements MealRecognitionService {

    private final OllamaService ollamaService;

    @Value("${ai.ollama.default-model:qwen2.5-vl}")
    private String modelName;

    private static final String SYSTEM_PROMPT = """
            You are a nutritional analysis assistant. Analyze the meal image and provide nutritional information.
            Respond ONLY with valid JSON in this exact format:
            {
              "foodName": "name of the food",
              "portionSize": number in grams,
              "portionUnit": "grams",
              "calories": estimated calories,
              "protein": protein in grams,
              "carb": carbohydrates in grams,
              "fat": fat in grams,
              "confidenceScore": confidence between 0.0 and 1.0,
              "fallback": true if you're uncertain,
              "message": "brief message if needed"
            }
            """;

    @Override
    public MealRecognitionResult recognizeMeal(String imageUrl, String mealType) {
        if (!ollamaService.isAvailable()) {
            log.warn("Ollama service is not available, returning fallback result");
            return buildFallbackResult("AI service is currently unavailable");
        }

        try {
            String prompt = buildPrompt(mealType);
            Map<String, Object> requestBody = Map.of(
                    "model", modelName,
                    "messages", List.of(
                            Map.of("role", "system", "content", SYSTEM_PROMPT),
                            Map.of("role", "user", "content", List.of(
                                    Map.of("type", "text", "text", prompt),
                                    Map.of("type", "image_url", "image_url", Map.of("url", imageUrl))
                            ))
                    ),
                    "temperature", 0.1,
                    "stream", false
            );

            Map<String, Object> response = ollamaService.post("/api/chat", requestBody, Map.class);
            return parseResponse(response);

        } catch (Exception e) {
            log.error("Failed to recognize meal: {}", e.getMessage(), e);
            return buildFallbackResult("Failed to analyze image: " + e.getMessage());
        }
    }

    private String buildPrompt(String mealType) {
        return String.format(
                "Analyze this food image and provide nutritional information for a %s meal. " +
                "Estimate portion size and macros accurately.",
                mealType != null ? mealType : "general"
        );
    }

    @SuppressWarnings("unchecked")
    private MealRecognitionResult parseResponse(Map<String, Object> response) {
        try {
            List<Map<String, Object>> messages = (List<Map<String, Object>>) response.get("message");
            if (messages == null || messages.isEmpty()) {
                return buildFallbackResult("Empty response from AI service");
            }

            Map<String, Object> content = messages.get(0);
            String contentText = (String) content.get("content");
            if (contentText == null) {
                return buildFallbackResult("No content in AI response");
            }

            String jsonStr = extractJson(contentText);
            Map<String, Object> nutrition = parseJsonToMap(jsonStr);

            return MealRecognitionResult.builder()
                    .foodName(getString(nutrition, "foodName", "Unknown Food"))
                    .portionSize(toBd(nutrition.get("portionSize")))
                    .portionUnit(getString(nutrition, "portionUnit", "grams"))
                    .calories(toBd(nutrition.get("calories")))
                    .protein(toBd(nutrition.get("protein")))
                    .carb(toBd(nutrition.get("carb")))
                    .fat(toBd(nutrition.get("fat")))
                    .confidenceScore(toBdOrDefault(nutrition.get("confidenceScore"), 0.5))
                    .fallback(Boolean.TRUE.equals(nutrition.get("fallback")))
                    .message(getString(nutrition, "message", ""))
                    .build();
        } catch (Exception e) {
            log.error("Failed to parse AI response: {}", e.getMessage());
            return buildFallbackResult("Failed to parse AI response");
        }
    }

    private MealRecognitionResult buildFallbackResult(String message) {
        return MealRecognitionResult.builder()
                .foodName("Meal")
                .portionSize(BigDecimal.valueOf(200))
                .portionUnit("grams")
                .calories(BigDecimal.valueOf(300))
                .protein(BigDecimal.valueOf(15))
                .carb(BigDecimal.valueOf(35))
                .fat(BigDecimal.valueOf(10))
                .confidenceScore(BigDecimal.valueOf(0.0))
                .fallback(true)
                .message(message)
                .build();
    }

    private String extractJson(String text) {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return text.substring(start, end + 1);
        }
        return text;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJsonToMap(String json) {
        Map<String, Object> result = new java.util.HashMap<>();
        json = json.replaceAll("[{}\"]", "");
        String[] pairs = json.split(",");
        for (String pair : pairs) {
            String[] kv = pair.split(":");
            if (kv.length >= 2) {
                String key = kv[0].trim();
                String value = kv[1].trim();
                if (key.equals("fallback")) {
                    result.put(key, Boolean.parseBoolean(value));
                } else {
                    try {
                        result.put(key, Double.parseDouble(value));
                    } catch (NumberFormatException e) {
                        result.put(key, value);
                    }
                }
            }
        }
        return result;
    }

    private BigDecimal toBd(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal) return (BigDecimal) value;
        if (value instanceof Number) return BigDecimal.valueOf(((Number) value).doubleValue());
        try {
            return new BigDecimal(value.toString());
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    private BigDecimal toBdOrDefault(Object value, double defaultVal) {
        BigDecimal result = toBd(value);
        return result.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.valueOf(defaultVal) : result;
    }

    private String getString(Map<String, Object> map, String key, String defaultVal) {
        Object val = map.get(key);
        return val != null ? val.toString() : defaultVal;
    }
}
