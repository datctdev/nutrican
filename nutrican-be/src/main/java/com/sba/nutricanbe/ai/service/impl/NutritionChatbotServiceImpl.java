package com.sba.nutricanbe.ai.service.impl;

import com.sba.nutricanbe.ai.service.NutritionChatbotService;
import com.sba.nutricanbe.ai.service.OllamaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class NutritionChatbotServiceImpl implements NutritionChatbotService {

    private final OllamaService ollamaService;

    @Value("${ai.ollama.default-model:qwen2.5-vl}")
    private String modelName;

    private static final String SYSTEM_PROMPT = """
            You are a professional nutritional chatbot for the NutriCan PT system.
            You help users with:
            - Diet advice and meal planning
            - Nutritional information about foods
            - Macronutrient calculations
            - Calorie tracking guidance
            - Healthy eating tips

            Provide accurate, helpful, and concise responses.
            If you're unsure about specific nutritional data, suggest consulting a healthcare professional.
            """;

    @Override
    public String chat(String userMessage, String userContext) {
        if (!ollamaService.isAvailable()) {
            return "AI chatbot is currently unavailable. Please try again later.";
        }

        if (userMessage == null || userMessage.trim().isEmpty()) {
            return "Please provide a message to chat about nutrition.";
        }

        try {
            String fullContext = buildContext(userContext);
            Map<String, Object> requestBody = Map.of(
                    "model", modelName,
                    "messages", List.of(
                            Map.of("role", "system", "content", SYSTEM_PROMPT),
                            Map.of("role", "user", "content", fullContext + "\n\nUser: " + userMessage)
                    ),
                    "temperature", 0.7,
                    "stream", false
            );

            Map<String, Object> response = ollamaService.post("/api/chat", requestBody, Map.class);
            return extractResponse(response);

        } catch (Exception e) {
            log.error("Failed to get chatbot response: {}", e.getMessage(), e);
            return "Sorry, I couldn't process your request. Please try again.";
        }
    }

    private String buildContext(String userContext) {
        if (userContext == null || userContext.trim().isEmpty()) {
            return "The user is asking about nutrition and diet.";
        }
        return "User context: " + userContext;
    }

    @SuppressWarnings("unchecked")
    private String extractResponse(Map<String, Object> response) {
        try {
            List<Map<String, Object>> messages = (List<Map<String, Object>>) response.get("message");
            if (messages == null || messages.isEmpty()) {
                return "I couldn't generate a response. Please try again.";
            }

            Map<String, Object> message = messages.get(0);
            Object content = message.get("content");
            if (content == null) {
                return "I couldn't generate a response. Please try again.";
            }
            return content.toString();
        } catch (Exception e) {
            log.error("Failed to extract chatbot response: {}", e.getMessage());
            return "I encountered an error processing your request.";
        }
    }
}
