package com.sba.nutricanbe.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProgressTimelineIntegrationTest extends IntegrationTestBase {

    @BeforeEach
    void setUp() {
        stubAiAndStorage();
    }

    @Test
    void goalsAndBodyMetric_reflectedInProgress() throws Exception {
        mockMvc.perform(put("/api/v1/profile/goals")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nutritionGoal": "WEIGHT_LOSS",
                                  "targetWeight": 68,
                                  "baselineWeight": 75,
                                  "targetDate": "%s"
                                }
                                """.formatted(LocalDate.now().plusMonths(2))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/profile/body-metrics")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"recordDate": "%s", "weight": 74.5}
                                """.formatted(LocalDate.now())))
                .andExpect(status().isOk());

        var customerId = userRepository.findByEmail("customer1@gmail.com").orElseThrow().getId();

        mockMvc.perform(get("/api/v1/workspace/progress/" + customerId)
                        .with(asUser("pt.certified@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.goals.targetWeight").value(68))
                .andExpect(jsonPath("$.data.bodyMetrics").isArray());
    }

    @Test
    void weightRegressionAlert_whenTwoConsecutiveIncreases() throws Exception {
        mockMvc.perform(put("/api/v1/profile/goals")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nutritionGoal": "WEIGHT_LOSS",
                                  "targetWeight": 68,
                                  "baselineWeight": 75,
                                  "targetDate": "%s"
                                }
                                """.formatted(LocalDate.now().plusMonths(2))))
                .andExpect(status().isOk());

        LocalDate d1 = LocalDate.now().minusDays(2);
        LocalDate d2 = LocalDate.now().minusDays(1);
        LocalDate d3 = LocalDate.now();
        for (var entry : new Object[][]{{d1, 70.0}, {d2, 70.6}, {d3, 71.2}}) {
            mockMvc.perform(post("/api/v1/profile/body-metrics")
                            .with(asUser("customer1@gmail.com"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"recordDate": "%s", "weight": %s}
                                    """.formatted(entry[0], entry[1])))
                    .andExpect(status().isOk());
        }

        var customerId = userRepository.findByEmail("customer1@gmail.com").orElseThrow().getId();
        mockMvc.perform(get("/api/v1/workspace/progress/" + customerId)
                        .with(asUser("pt.certified@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.regressionAlert.active").value(true));
    }

    @Test
    void weightRegression_inactiveWhenIncreaseBelowThreshold() throws Exception {
        mockMvc.perform(put("/api/v1/profile/goals")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nutritionGoal": "WEIGHT_LOSS",
                                  "targetWeight": 68,
                                  "baselineWeight": 75,
                                  "targetDate": "%s"
                                }
                                """.formatted(LocalDate.now().plusMonths(2))))
                .andExpect(status().isOk());

        LocalDate d1 = LocalDate.now().minusDays(2);
        LocalDate d2 = LocalDate.now().minusDays(1);
        LocalDate d3 = LocalDate.now();
        for (var entry : new Object[][]{{d1, 70.0}, {d2, 70.2}, {d3, 70.3}}) {
            mockMvc.perform(post("/api/v1/profile/body-metrics")
                            .with(asUser("customer1@gmail.com"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"recordDate": "%s", "weight": %s}
                                    """.formatted(entry[0], entry[1])))
                    .andExpect(status().isOk());
        }

        var customerId = userRepository.findByEmail("customer1@gmail.com").orElseThrow().getId();
        mockMvc.perform(get("/api/v1/workspace/progress/" + customerId)
                        .with(asUser("pt.certified@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.regressionAlert.active").value(false));
    }
}
