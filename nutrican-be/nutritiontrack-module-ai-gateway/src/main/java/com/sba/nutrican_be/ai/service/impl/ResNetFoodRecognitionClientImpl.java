package com.sba.nutrican_be.ai.service.impl;

import com.sba.nutrican_be.ai.dto.ResNetAnalyzeResponse;
import com.sba.nutrican_be.ai.service.ResNetFoodRecognitionClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.time.Duration;

@Slf4j
@Component
public class ResNetFoodRecognitionClientImpl implements ResNetFoodRecognitionClient {

    private final WebClient webClient;
    private final boolean enabled;

    public ResNetFoodRecognitionClientImpl(
            @Value("${ai.resnet.base-url:http://localhost:8000}") String baseUrl,
            @Value("${ai.resnet.enabled:true}") boolean enabled) {
        this.enabled = enabled;
        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    @Override
    public ResNetAnalyzeResponse analyze(MultipartFile file) {
        if (!enabled) {
            ResNetAnalyzeResponse response = new ResNetAnalyzeResponse();
            response.setSuccess(false);
            response.setMessage("ResNet AI service is disabled");
            return response;
        }
        try {
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("file", new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename() != null ? file.getOriginalFilename() : "meal.jpg";
                }
            }).contentType(MediaType.parseMediaType(
                    file.getContentType() != null ? file.getContentType() : MediaType.IMAGE_JPEG_VALUE));

            return webClient.post()
                    .uri("/api/v1/analyze-food")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(ResNetAnalyzeResponse.class)
                    .block(Duration.ofSeconds(30));
        } catch (IOException e) {
            log.error("Failed to read image for ResNet API: {}", e.getMessage());
            ResNetAnalyzeResponse response = new ResNetAnalyzeResponse();
            response.setSuccess(false);
            response.setMessage("Failed to read image: " + e.getMessage());
            return response;
        } catch (Exception e) {
            log.error("ResNet API call failed: {}", e.getMessage());
            ResNetAnalyzeResponse response = new ResNetAnalyzeResponse();
            response.setSuccess(false);
            response.setMessage("ResNet API unavailable: " + e.getMessage());
            return response;
        }
    }

    @Override
    public boolean isHealthy() {
        if (!enabled) {
            return false;
        }
        try {
            webClient.get()
                    .uri("/health")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofSeconds(5));
            return true;
        } catch (Exception e) {
            log.warn("ResNet health check failed: {}", e.getMessage());
            return false;
        }
    }
}
