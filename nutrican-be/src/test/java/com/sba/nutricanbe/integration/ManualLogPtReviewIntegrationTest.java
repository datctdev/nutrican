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

class ManualLogPtReviewIntegrationTest extends IntegrationTestBase {

    @BeforeEach
    void setUp() {
        stubAiAndStorage();
    }

    @Test
    void manualLogSendToPt_appearsInPtPending_thenApprove() throws Exception {
        String createBody = """
                {
                  "mealType": "LUNCH",
                  "calories": 520,
                  "protein": 30,
                  "carb": 50,
                  "fat": 15,
                  "logDate": "%s",
                  "sendToPt": true
                }
                """.formatted(LocalDate.now());

        String createRes = mockMvc.perform(post("/api/v1/diet/logs")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reviewStatus").value("PENDING"))
                .andReturn().getResponse().getContentAsString();

        String logId = objectMapper.readTree(createRes).get("data").get("id").asText();

        mockMvc.perform(get("/api/v1/workspace/diet-logs/pending")
                        .with(asUser("pt.certified@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[?(@.id=='" + logId + "')]").exists());

        mockMvc.perform(put("/api/v1/workspace/diet-logs/" + logId + "/review")
                        .with(asUser("pt.certified@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"APPROVE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(logId));
    }
}
