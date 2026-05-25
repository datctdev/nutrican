package com.sba.nutrican_be.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import java.util.Map;

@Slf4j
@Service
public class OllamaService {

    private final WebClient webClient;

    public OllamaService(@Value("${ai.ollama.base-url}") String baseUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    public <T> T post(String endpoint, Object body, Class<T> responseType) {
        try {
            return webClient.post()
                    .uri(endpoint)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(responseType)
                    .block();
        } catch (Exception e) {
            log.error("Ollama API call failed: {} - {}", endpoint, e.getMessage());
            throw new RuntimeException("AI service unavailable: " + e.getMessage(), e);
        }
    }

    public boolean isAvailable() {
        try {
            webClient.get().uri("/api/tags").retrieve().bodyToMono(Map.class).block();
            return true;
        } catch (Exception e) {
            log.warn("Ollama is not available: {}", e.getMessage());
            return false;
        }
    }
}
