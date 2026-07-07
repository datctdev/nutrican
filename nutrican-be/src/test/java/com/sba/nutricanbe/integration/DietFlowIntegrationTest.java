package com.sba.nutricanbe.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DietFlowIntegrationTest extends IntegrationTestBase {

    @BeforeEach
    void setUp() {
        stubAiAndStorage();
    }

    @Test
    void analyzeConfirmAndSummary() throws Exception {
        String analyzeBody = mockMvc.perform(multipart("/api/v1/diet/logs/analyze")
                        .file(sampleImage())
                        .param("meal_type", "LUNCH")
                        .with(asUser("customer1@gmail.com")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String logId = objectMapper.readTree(analyzeBody).get("data").get("logId").asText();

        mockMvc.perform(put("/api/v1/diet/logs/" + logId + "/confirm-recognition")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"foodCode\":\"pho\",\"adjustedGrams\":400,\"sendToPt\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("LOGGED"));

        mockMvc.perform(get("/api/v1/diet/summary")
                        .param("date", java.time.LocalDate.now().toString())
                        .with(asUser("customer1@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.logs").isArray());
    }
}
