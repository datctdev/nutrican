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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RecalculateMacrosIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MacroTargetRepository macroTargetRepository;

    @BeforeEach
    void setUp() {
        stubAiAndStorage();
    }

    private static final String SOLO_CUSTOMER = "customer2@gmail.com";
    private static final String COACHED_CUSTOMER = "customer1@gmail.com";

    @Test
    void recalculateMacros_savesLevelAndUpdatesTarget_atomically() throws Exception {
        var user = userRepository.findByEmail(SOLO_CUSTOMER).orElseThrow();
        user.setHeightCm(170);
        user.setGender("male");
        user.setActivityLevel(ActivityLevel.MODERATE);
        userRepository.save(user);

        mockMvc.perform(post("/api/v1/profile/recalculate-macros")
                        .with(asUser(SOLO_CUSTOMER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"activityLevel": "LIGHT", "nutritionGoal": "MAINTAIN"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.activityLevel").value("LIGHT"))
                .andExpect(jsonPath("$.data.macros.dailyCalories").isNumber());

        var refreshed = userRepository.findByEmail(SOLO_CUSTOMER).orElseThrow();
        assertThat(refreshed.getActivityLevel()).isEqualTo(ActivityLevel.LIGHT);
        assertThat(macroTargetRepository.findByUserId(refreshed.getId())).isPresent();
    }

    @Test
    void recalculateMacros_weightLossVsWeightGain_differentCalories() throws Exception {
        var user = userRepository.findByEmail(SOLO_CUSTOMER).orElseThrow();
        user.setHeightCm(170);
        user.setGender("male");
        user.setActivityLevel(ActivityLevel.MODERATE);
        userRepository.save(user);

        mockMvc.perform(post("/api/v1/profile/body-metrics")
                        .with(asUser(SOLO_CUSTOMER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"weight": 70}
                                """))
                .andExpect(status().isOk());

        var lossResult = mockMvc.perform(post("/api/v1/profile/recalculate-macros")
                        .with(asUser(SOLO_CUSTOMER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"activityLevel": "MODERATE", "nutritionGoal": "WEIGHT_LOSS"}
                                """))
                .andExpect(status().isOk())
                .andReturn();
        BigDecimal lossCal = objectMapper.readTree(lossResult.getResponse().getContentAsString())
                .path("data").path("macros").path("dailyCalories").decimalValue();

        var gainResult = mockMvc.perform(post("/api/v1/profile/recalculate-macros")
                        .with(asUser(SOLO_CUSTOMER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"activityLevel": "MODERATE", "nutritionGoal": "WEIGHT_GAIN"}
                                """))
                .andExpect(status().isOk())
                .andReturn();
        BigDecimal gainCal = objectMapper.readTree(gainResult.getResponse().getContentAsString())
                .path("data").path("macros").path("dailyCalories").decimalValue();

        assertThat(gainCal).isGreaterThan(lossCal);
    }

    @Test
    void recalculateMacros_rejectsWhenHasActivePt() throws Exception {
        mockMvc.perform(post("/api/v1/profile/recalculate-macros")
                        .with(asUser(COACHED_CUSTOMER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"activityLevel": "MODERATE", "nutritionGoal": "MAINTAIN"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void setMacroTarget_rejectsWhenHasActivePt() throws Exception {
        mockMvc.perform(put("/api/v1/profile/macro-target")
                        .with(asUser(COACHED_CUSTOMER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"dailyCalories": 2000, "protein": 120, "carb": 220, "fat": 65}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void recalculateMacros_rejectsInvalidEnum() throws Exception {
        mockMvc.perform(post("/api/v1/profile/recalculate-macros")
                        .with(asUser(SOLO_CUSTOMER))
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
