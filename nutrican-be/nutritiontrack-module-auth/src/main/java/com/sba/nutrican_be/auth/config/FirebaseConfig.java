package com.sba.nutrican_be.auth.config;

import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Slf4j
@Configuration
public class FirebaseConfig {

    @Value("${app.firebase.enabled:false}")
    private boolean firebaseEnabled;

    @Value("${app.firebase.credentials.path:}")
    private String credentialsPath;

    @PostConstruct
    public void initialize() {
        if (!firebaseEnabled) {
            log.info("Firebase authentication is disabled (app.firebase.enabled=false)");
            return;
        }

        if (FirebaseApp.getApps().isEmpty()) {
            try {
                String jsonContent;
                if (StringUtils.hasText(credentialsPath)) {
                    ClassPathResource resource = new ClassPathResource(credentialsPath);
                    try (InputStream is = resource.getInputStream()) {
                        jsonContent = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                    }
                } else {
                    try (InputStream is = getClass().getResourceAsStream("/firebase-service-account.json")) {
                        if (is == null) {
                            log.warn("Firebase credentials file not found at '{}' or classpath:/firebase-service-account.json", credentialsPath);
                            return;
                        }
                        jsonContent = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                    }
                }

                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(
                                com.google.auth.oauth2.GoogleCredentials
                                        .fromStream(new java.io.ByteArrayInputStream(jsonContent.getBytes(StandardCharsets.UTF_8)))
                        )
                        .build();

                FirebaseApp.initializeApp(options);
                log.info("Firebase Admin SDK initialized successfully");
            } catch (IOException e) {
                log.error("Failed to initialize Firebase Admin SDK: {}", e.getMessage());
            }
        } else {
            log.info("Firebase Admin SDK already initialized");
        }
    }
}
