package com.sba.nutrican_be.ai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class NutritionChatbotService {

    private final WebClient webClient;

    @Value("${ai.ollama.default-model}")
    private String defaultModel;

    public String chat(String userMessage, String userContext) {
        try {
            String systemPrompt = """
                You are a professional nutritionist and diet advisor. 
                Provide helpful, accurate nutrition advice based on the user's goals.
                Keep responses concise and practical.
                If you don't have enough information, ask clarifying questions.
                """;

            Map<String, Object> userContent = new HashMap<>();
            if (userContext != null && !userContext.isEmpty()) {
                userContent.put("content", systemPrompt + "\n\nUser context: " + userContext + "\n\nUser: " + userMessage);
            } else {
                userContent.put("content", systemPrompt + "\n\nUser: " + userMessage);
            }

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", defaultModel);
            requestBody.put("messages", List.of(
                Map.of("role", "user", "content", userContent.get("content").toString())
            ));
            requestBody.put("stream", false);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = webClient.post()
                    .uri("/api/chat")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && response.get("message") != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> message = (Map<String, Object>) response.get("message");
                return (String) message.get("content");
            }
            return "I'm sorry, I couldn't process your request. Please try again.";
        } catch (Exception e) {
            log.error("Chatbot error: {}", e.getMessage());
            return "AI service is currently unavailable. Please try again later.";
        }
    }
}
