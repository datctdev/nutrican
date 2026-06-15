package com.sba.nutrican_be.ai.service.impl;

import com.sba.nutrican_be.ai.MealRecognitionResult;
import com.sba.nutrican_be.ai.service.MealRecognitionService;
import com.sba.nutrican_be.ai.service.OllamaService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sba.nutrican_be.core.exception.BadRequestException;
import com.sba.nutrican_be.core.util.PromptVersionUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MealRecognitionServiceImpl implements MealRecognitionService {

    private final OllamaService ollamaService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${ai.ollama.default-model:llava}")
    private String modelName;

    private static final String SYSTEM_PROMPT = """
        You are a nutritional analysis assistant specialized in food recognition.
        Analyze the meal image and provide nutritional information.
        Respond ONLY with valid JSON in this exact format:
        {
          "foodName": "name of the food",
          "portionSize": number in grams,
          "portionUnit": "grams",
          "calories": estimated calories,
          "protein": protein in grams,
          "carbs": carbohydrates in grams,
          "fat": fat in grams,
          "confidenceScore": confidence between 0.0 and 1.0,
          "mealComplexity": "SIMPLE or COMPOSITE or HOTPOT",
          "detectedItems": [{"name": "item name", "estimatedGrams": number}],
          "uncertaintyReasons": ["reason if any"],
          "fallback": true if you're uncertain,
          "message": "brief message if needed"
        }
        """;

    @Override
    public MealRecognitionResult recognizeMeal(String imageUrl, String mealType) {
        // For URL-based recognition, we need a vision-capable model
        // This method may not work with all models like llava
        if (!ollamaService.isAvailable()) {
            log.warn("Ollama service is not available, returning fallback result");
            return buildFallbackResult("AI service is currently unavailable");
        }

        try {
            String prompt = buildPrompt(mealType);
            Map<String, Object> requestBody = Map.of(
                    "model", modelName,
                    "prompt", prompt + "\n\nImage URL: " + imageUrl,
                    "stream", false
            );

            Map<String, Object> response = ollamaService.post("/api/generate", requestBody, Map.class);
            return parseGenerateResponse(response);

        } catch (Exception e) {
            log.error("Failed to recognize meal from URL: {}", e.getMessage(), e);
            return buildFallbackResult("Failed to analyze image URL: " + e.getMessage());
        }
    }

    @Override
    public MealRecognitionResult recognizeMealFromFile(MultipartFile file, String mealType) {
        return recognizeMealFromFile(file, mealType, null, null);
    }

    @Override
    public MealRecognitionResult recognizeMealFromFile(MultipartFile file, String mealType, String mealSource, String mealComplexity) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Image file is required");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException("File must be an image");
        }

        try {
            String base64Image = Base64.getEncoder().encodeToString(file.getBytes());
            return recognizeMealFromBase64Image(base64Image, mealType, mealSource, mealComplexity);
        } catch (IOException e) {
            log.error("Failed to read image file: {}", e.getMessage(), e);
            return buildFallbackResult("Failed to read image file");
        }
    }

    private MealRecognitionResult recognizeMealFromBase64Image(String base64Image, String mealType) {
        return recognizeMealFromBase64Image(base64Image, mealType, null, null);
    }

    private MealRecognitionResult recognizeMealFromBase64Image(String base64Image, String mealType, String mealSource, String mealComplexity) {
        if (!ollamaService.isAvailable()) {
            log.warn("Ollama service is not available, returning fallback result");
            return buildFallbackResult("AI service is currently unavailable");
        }

        try {
            String prompt = buildPrompt(mealType, mealSource, mealComplexity);

            Map<String, Object> response;
            if (modelName.startsWith("minicpm")) {
                Map<String, Object> requestBody = Map.of(
                        "model", modelName,
                        "messages", List.of(Map.of(
                                "role", "user",
                                "content", prompt,
                                "images", List.of(base64Image)
                        )),
                        "format", "json",
                        "stream", false
                );
                response = ollamaService.post("/api/chat", requestBody, Map.class);
                return parseChatResponse(response);
            } else {
                // Standard Ollama vision models use /api/generate
                Map<String, Object> requestBody = Map.of(
                        "model", modelName,
                        "images", List.of(base64Image),
                        "prompt", prompt,
                        "stream", false,
                        "options", Map.of("temperature", 0.1)
                );
                response = ollamaService.post("/api/generate", requestBody, Map.class);
                return parseGenerateResponse(response);
            }

        } catch (Exception e) {
            log.error("Failed to recognize meal from image: {}", e.getMessage(), e);
            return buildFallbackResult("Failed to analyze image: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private MealRecognitionResult parseChatResponse(Map<String, Object> response) {
        try {
            Map<String, Object> message = (Map<String, Object>) response.get("message");
            if (message == null) {
                return buildFallbackResult("Empty response from AI service");
            }

            String contentText = (String) message.get("content");
            if (contentText == null || contentText.isEmpty()) {
                return buildFallbackResult("Empty response from AI service");
            }

            log.info("AI Response: {}", contentText);

            String jsonStr = extractJson(contentText);
            Map<String, Object> nutrition = parseJsonToMap(jsonStr);

            return buildResultFromMap(nutrition);
        } catch (Exception e) {
            log.error("Failed to parse chat response: {}", e.getMessage());
            return buildFallbackResult("Failed to parse AI response");
        }
    }

    @Override
    public boolean isAvailable() {
        return ollamaService.isAvailable();
    }

    @Override
    public String getModelName() {
        return modelName;
    }

    @Override
    public String getPromptVersionHash() {
        return PromptVersionUtil.hashPrompt(SYSTEM_PROMPT);
    }

    private String buildPrompt(String mealType) {
        return buildPrompt(mealType, null, null);
    }

    private String buildPrompt(String mealType, String mealSource, String mealComplexity) {
        return SYSTEM_PROMPT + "\n\n" +
                String.format(
                "Analyze this food image and provide nutritional information for a %s meal. " +
                "Context: mealSource=%s, mealComplexity=%s. " +
                "Estimate portion size and macros accurately. Be specific about the food type. " +
                "For HOTPOT meals, list detectedItems separately. Respond ONLY with valid JSON.",
                mealType != null ? mealType : "general",
                mealSource != null ? mealSource : "HOME_COOKED",
                mealComplexity != null ? mealComplexity : "SIMPLE"
        );
    }

    @SuppressWarnings("unchecked")
    private MealRecognitionResult parseGenerateResponse(Map<String, Object> response) {
        try {
            String contentText = (String) response.get("response");
            if (contentText == null || contentText.isEmpty()) {
                return buildFallbackResult("Empty response from AI service");
            }

            log.info("AI Response: {}", contentText);

            String jsonStr = extractJson(contentText);
            Map<String, Object> nutrition = parseJsonToMap(jsonStr);

            return buildResultFromMap(nutrition);
        } catch (Exception e) {
            log.error("Failed to parse AI response: {}", e.getMessage());
            return buildFallbackResult("Failed to parse AI response");
        }
    }

    @SuppressWarnings("unchecked")
    private MealRecognitionResult parseResponse(Map<String, Object> response) {
        try {
            Map<String, Object> message = (Map<String, Object>) response.get("message");
            if (message == null) {
                return buildFallbackResult("Empty response from AI service");
            }

            String contentText = (String) message.get("content");
            if (contentText == null) {
                return buildFallbackResult("No content in AI response");
            }

            String jsonStr = extractJson(contentText);
            Map<String, Object> nutrition = parseJsonToMap(jsonStr);

            return buildResultFromMap(nutrition);
        } catch (Exception e) {
            log.error("Failed to parse AI response: {}", e.getMessage());
            return buildFallbackResult("Failed to parse AI response");
        }
    }

    @SuppressWarnings("unchecked")
    private MealRecognitionResult buildResultFromMap(Map<String, Object> nutrition) {
        List<Map<String, Object>> detectedItems = Collections.emptyList();
        Object itemsObj = nutrition.get("detectedItems");
        if (itemsObj instanceof List<?> list) {
            detectedItems = new ArrayList<>();
            for (Object o : list) {
                if (o instanceof Map<?, ?> m) {
                    detectedItems.add((Map<String, Object>) m);
                }
            }
        }
        List<String> uncertaintyReasons = Collections.emptyList();
        Object reasonsObj = nutrition.get("uncertaintyReasons");
        if (reasonsObj instanceof List<?> list) {
            uncertaintyReasons = list.stream().map(Object::toString).toList();
        }
        BigDecimal confidenceScore = toBdOrDefault(nutrition.get("confidenceScore"), 0.5);
        boolean fallback = Boolean.TRUE.equals(nutrition.get("fallback"))
                && confidenceScore.compareTo(new BigDecimal("0.6")) < 0;
        return MealRecognitionResult.builder()
                .foodName(getString(nutrition, "foodName", "Unknown Food"))
                .portionSize(toBd(nutrition.get("portionSize")))
                .portionUnit(getString(nutrition, "portionUnit", "grams"))
                .calories(toBd(nutrition.get("calories")))
                .protein(toBd(nutrition.get("protein")))
                .carbs(toBd(nutrition.get("carbs")))
                .fat(toBd(nutrition.get("fat")))
                .confidenceScore(confidenceScore)
                .fallback(fallback)
                .message(getString(nutrition, "message", ""))
                .mealComplexityFromAi(getString(nutrition, "mealComplexity", null))
                .detectedItems(detectedItems)
                .uncertaintyReasons(uncertaintyReasons)
                .build();
    }

    private MealRecognitionResult buildFallbackResult(String message) {
        return MealRecognitionResult.builder()
                .foodName("Meal")
                .portionSize(BigDecimal.valueOf(200))
                .portionUnit("grams")
                .calories(BigDecimal.valueOf(300))
                .protein(BigDecimal.valueOf(15))
                .carbs(BigDecimal.valueOf(35))
                .fat(BigDecimal.valueOf(10))
                .confidenceScore(BigDecimal.valueOf(0.0))
                .fallback(true)
                .message(message)
                .build();
    }

    private String extractJson(String text) {
        // Remove markdown code blocks if present
        text = text.replaceAll("```json\\s*", "");
        text = text.replaceAll("```\\s*", "");
        text = text.trim();

        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return text.substring(start, end + 1);
        }
        return text;
    }

    private Map<String, Object> parseJsonToMap(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("Jackson parse failed, using empty map: {}", e.getMessage());
            return Map.of();
        }
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
