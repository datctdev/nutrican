package com.sba.nutrican_be.kyc.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.web.client.RestClient;

@Configuration
@RequiredArgsConstructor
public class RestClientConfig {

    private final EKycConfig cfg;

    @Bean
    public RestClient vnptRestClient() {
        return RestClient.builder()
                .baseUrl(cfg.getBaseUrl())
                .defaultHeader(
                        "Authorization",
                        "Bearer " + cfg.getAccessToken()
                )
                .defaultHeader(
                        "Token-id",
                        cfg.getTokenId()
                )
                .defaultHeader(
                        "Token-key",
                        cfg.getTokenKey()
                )

                .build();
    }

    @Bean
    public ObjectMapper objectMapper() {
        return Jackson2ObjectMapperBuilder.json()
                .modules(new JavaTimeModule())
                .featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .build();
    }
}
