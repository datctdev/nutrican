package com.sba.nutricanbe.ai.config;

import com.sba.nutricanbe.ai.catalog.ResNetClassManifest;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ResNetClassManifestConfig {

    @Value("${ai.resnet.class-profile:resnet_unified}")
    private String classProfile;

    @PostConstruct
    void init() {
        ResNetClassManifest.setActiveProfile(classProfile);
    }
}
