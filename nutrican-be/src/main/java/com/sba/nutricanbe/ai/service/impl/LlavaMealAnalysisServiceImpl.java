package com.sba.nutricanbe.ai.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sba.nutricanbe.ai.util.LlavaMealPromptBuilder;
import com.sba.nutricanbe.ai.catalog.ResNetFoodCodeMapping;
import com.sba.nutricanbe.ai.dto.LlavaMealAnalysisResult;
import com.sba.nutricanbe.ai.service.LlavaMealAnalysisService;
import com.sba.nutricanbe.ai.service.OllamaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class LlavaMealAnalysisServiceImpl implements LlavaMealAnalysisService {

    private static final Pattern JSON_BLOCK = Pattern.compile("\\{[\\s\\S]*}", Pattern.DOTALL);

    private final OllamaService ollamaService;
    private final ObjectMapper objectMapper;

    @Value("${ai.ollama.meal-analysis.model:${ai.ollama.default-model:llava}}")
    private String modelName;

    @Value("${ai.ollama.meal-analysis.enabled:true}")
    private boolean enabled;

    @Override
    public LlavaMealAnalysisResult analyzeMealImage(MultipartFile file, String resnetHint, String resnetFoodCode) {
        if (!enabled || !ollamaService.isAvailable()) {
            return LlavaMealAnalysisResult.builder()
                    .success(false)
                    .message("LLaVA unavailable")
                    .build();
        }
        try {
            String base64 = Base64.getEncoder().encodeToString(file.getBytes());
            String hintName = ResNetFoodCodeMapping.catalogNameViOrDisplay(
                    resnetFoodCode != null ? resnetFoodCode : "", resnetHint != null ? resnetHint : "unknown");
            String prompt = LlavaMealPromptBuilder.buildPrompt(
                    resnetFoodCode != null ? resnetFoodCode : "unknown",
                    hintName);

            Map<String, Object> request = Map.of(
                    "model", modelName,
                    "messages", List.of(Map.of(
                            "role", "user",
                            "content", prompt,
                            "images", List.of(base64))),
                    "stream", false,
                    "format", "json");

            @SuppressWarnings("unchecked")
            Map<String, Object> response = ollamaService.post("/api/chat", request, Map.class);
            String content = extractContent(response);
            if (content == null || content.isBlank()) {
                return fail("Empty LLaVA response");
            }

            String json = extractJson(content);
            Map<String, Object> parsed = objectMapper.readValue(json, new TypeReference<>() {});

            List<LlavaMealAnalysisResult.LlavaFoodItem> items = parseItems(parsed.get("items"));
            return LlavaMealAnalysisResult.builder()
                    .success(true)
                    .foodNameVi(stringVal(parsed.get("food_name_vi")))
                    .portionDescription(stringVal(parsed.get("portion_description")))
                    .estimatedTotalGrams(toBd(parsed.get("total_estimated_grams")))
                    .confidence(toBd(parsed.get("confidence")))
                    .calories(toBd(parsed.get("calories")))
                    .protein(toBd(parsed.get("protein_g")))
                    .fat(toBd(parsed.get("fat_g")))
                    .carbs(toBd(parsed.get("carb_g")))
                    .items(items)
                    .rawJson(json)
                    .message(stringVal(parsed.get("food_code_guess")))
                    .build();
        } catch (Exception e) {
            log.warn("LLaVA meal analysis failed: {}", e.getMessage());
            return fail(e.getMessage());
        }
    }

    @Override
    public boolean isAvailable() {
        return enabled && ollamaService.isAvailable();
    }

    private LlavaMealAnalysisResult fail(String msg) {
        return LlavaMealAnalysisResult.builder().success(false).message(msg).build();
    }

    @SuppressWarnings("unchecked")
    private String extractContent(Map<String, Object> response) {
        if (response == null) {
            return null;
        }
        Object message = response.get("message");
        if (message instanceof Map<?, ?> msg) {
            Object content = msg.get("content");
            return content != null ? content.toString() : null;
        }
        return null;
    }

    private String extractJson(String content) {
        Matcher m = JSON_BLOCK.matcher(content.trim());
        if (m.find()) {
            return m.group();
        }
        return content.trim();
    }

    @SuppressWarnings("unchecked")
    private List<LlavaMealAnalysisResult.LlavaFoodItem> parseItems(Object raw) {
        if (!(raw instanceof List<?> list)) {
            return List.of();
        }
        return list.stream()
                .filter(Map.class::isInstance)
                .map(o -> (Map<String, Object>) o)
                .map(m -> LlavaMealAnalysisResult.LlavaFoodItem.builder()
                        .name(stringVal(m.get("name")))
                        .estimatedGrams(toBd(m.get("estimated_grams")))
                        .role(stringVal(m.get("role")))
                        .build())
                .toList();
    }

    private String stringVal(Object o) {
        return o == null ? null : o.toString();
    }

    private BigDecimal toBd(Object o) {
        if (o == null) {
            return null;
        }
        try {
            return new BigDecimal(o.toString()).setScale(2, RoundingMode.HALF_UP);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}

