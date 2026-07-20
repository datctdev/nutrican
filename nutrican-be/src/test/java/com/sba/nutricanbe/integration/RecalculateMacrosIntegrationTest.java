package com.sba.nutricanbe.integration;

import com.sba.nutricanbe.user.enums.ActivityLevel;
import com.sba.nutricanbe.user.repository.MacroTargetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RecalculateMacrosIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MacroTargetRepository macroTargetRepository;

    @BeforeEach
    void setUp() {
        stubAiAndStorage();
    }

    @Test
    void recalculateMacros_savesLevelAndUpdatesTarget_atomically() throws Exception {
        var user = userRepository.findByEmail("customer1@gmail.com").orElseThrow();
        user.setHeightCm(170);
        user.setGender("male");
        user.setActivityLevel(ActivityLevel.MODERATE);
        userRepository.save(user);

        mockMvc.perform(post("/api/v1/profile/recalculate-macros")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"activityLevel": "LIGHT", "nutritionGoal": "MAINTAIN"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.activityLevel").value("LIGHT"))
                .andExpect(jsonPath("$.data.macros.dailyCalories").isNumber());

        var refreshed = userRepository.findByEmail("customer1@gmail.com").orElseThrow();
        assertThat(refreshed.getActivityLevel()).isEqualTo(ActivityLevel.LIGHT);
        assertThat(macroTargetRepository.findByUserId(refreshed.getId())).isPresent();
    }

    @Test
    void recalculateMacros_rejectsInvalidEnum() throws Exception {
        mockMvc.perform(post("/api/v1/profile/recalculate-macros")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"activityLevel": "ULTRA"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void macroSuggestion_withoutParam_usesStoredActivityLevel() throws Exception {
        var user = userRepository.findByEmail("customer1@gmail.com").orElseThrow();
        user.setHeightCm(170);
        user.setGender("male");
        user.setActivityLevel(ActivityLevel.VERY_ACTIVE);
        userRepository.save(user);

        mockMvc.perform(post("/api/v1/profile/body-metrics")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"weight": 70}
                                """))
                .andExpect(status().isOk());

        MvcCalories moderate = fetchSuggestionCalories("customer1@gmail.com");

        user.setActivityLevel(ActivityLevel.SEDENTARY);
        userRepository.save(user);
        MvcCalories sedentary = fetchSuggestionCalories("customer1@gmail.com");

        assertThat(moderate.calories).isGreaterThan(sedentary.calories);
    }

    private MvcCalories fetchSuggestionCalories(String email) throws Exception {
        var result = mockMvc.perform(get("/api/v1/profile/macro-suggestion")
                        .with(asUser(email)))
                .andExpect(status().isOk())
                .andReturn();
        BigDecimal cal = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("dailyCalories").decimalValue();
        return new MvcCalories(cal);
    }

    private record MvcCalories(BigDecimal calories) {
    }
}
