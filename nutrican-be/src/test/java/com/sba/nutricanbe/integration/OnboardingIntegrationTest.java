package com.sba.nutricanbe.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class OnboardingIntegrationTest extends IntegrationTestBase {

    @BeforeEach
    void setUp() {
        stubAiAndStorage();
    }

    @Test
    void onboardingFlow_createsMacroTarget() throws Exception {
        var user = userRepository.findByEmail("customer2@gmail.com").orElseThrow();
        user.setOnboardingStep(1);
        user.setOnboardingCompletedAt(null);
        userRepository.save(user);

        mockMvc.perform(get("/api/v1/profile/onboarding-status")
                        .with(asUser("customer2@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.forceRedirect").value(true));

        mockMvc.perform(post("/api/v1/profile/onboarding")
                        .with(asUser("customer2@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "step": 1,
                                  "heightCm": 170,
                                  "weightKg": 65,
                                  "gender": "female",
                                  "dateOfBirth": "1998-05-01"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.step").value(2));

        mockMvc.perform(post("/api/v1/profile/onboarding")
                        .with(asUser("customer2@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "step": 2,
                                  "nutritionGoal": "WEIGHT_LOSS",
                                  "dietPreference": "NORMAL",
                                  "weightKg": 65
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.hasMacroTarget").value(true));

        mockMvc.perform(post("/api/v1/profile/onboarding")
                        .with(asUser("customer2@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"step\": 3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.completed").value(true));

        mockMvc.perform(get("/api/v1/profile/macro-target")
                        .with(asUser("customer2@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.dailyCalories").isNumber());
    }

    @Test
    void bodyMetric_rejectsFutureDate() throws Exception {
        mockMvc.perform(post("/api/v1/profile/body-metrics")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"recordDate": "%s", "weight": 70}
                                """.formatted(LocalDate.now().plusDays(1))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void onboardingSkip_setsShowBanner() throws Exception {
        var user = userRepository.findByEmail("customer2@gmail.com").orElseThrow();
        user.setOnboardingStep(1);
        user.setOnboardingCompletedAt(null);
        user.setOnboardingSkippedAt(null);
        userRepository.save(user);

        mockMvc.perform(post("/api/v1/profile/onboarding/skip")
                        .with(asUser("customer2@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.showBanner").value(true))
                .andExpect(jsonPath("$.data.forceRedirect").value(false));
    }

    @Test
    void onboardingResume_continuesFromSavedStep() throws Exception {
        var user = userRepository.findByEmail("customer2@gmail.com").orElseThrow();
        user.setOnboardingStep(2);
        user.setOnboardingCompletedAt(null);
        user.setOnboardingSkippedAt(null);
        userRepository.save(user);

        mockMvc.perform(get("/api/v1/profile/onboarding-status")
                        .with(asUser("customer2@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.step").value(2))
                .andExpect(jsonPath("$.data.forceRedirect").value(true));
    }
}
