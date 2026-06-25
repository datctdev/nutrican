package com.sba.nutricanbe.ai.service.impl;

import com.sba.nutricanbe.ai.service.OllamaService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Slf4j
@Service
public class OllamaServiceImpl implements OllamaService {

    private final WebClient webClient;
    private final String baseUrl;
    private final String defaultModel;

    public OllamaServiceImpl(@Value("${ai.ollama.base-url}") String baseUrl,
                              @Value("${ai.ollama.default-model}") String defaultModel) {
        this.baseUrl = baseUrl;
        this.defaultModel = defaultModel;
        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @Override
    public <T> T post(String endpoint, Object body, Class<T> responseType) {
        return webClient.post()
                .uri(endpoint)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(responseType)
                .block();
    }

    @Override
    public boolean isAvailable() {
        try {
            Map<String, Object> response = webClient.get()
                    .uri("/api/tags")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
            return response != null;
        } catch (Exception e) {
            log.warn("Ollama service is not available at {}: {}", baseUrl, e.getMessage());
            return false;
        }
    }

    public String getDefaultModel() {
        return defaultModel;
    }

    public String getBaseUrl() {
        return baseUrl;
    }
}
