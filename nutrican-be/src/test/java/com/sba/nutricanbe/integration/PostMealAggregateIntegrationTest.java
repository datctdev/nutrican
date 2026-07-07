package com.sba.nutricanbe.integration;

import com.sba.nutricanbe.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.LocalDate;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PostMealAggregateIntegrationTest extends IntegrationTestBase {

    @BeforeEach
    void setUp() {
        stubAiAndStorage();
    }

    @Test
    void feedbackSaved_reflectedInProgressAggregate() throws Exception {
        String createBody = """
                {
                  "mealType": "BREAKFAST",
                  "calories": 400,
                  "protein": 20,
                  "carb": 40,
                  "fat": 10,
                  "logDate": "%s"
                }
                """.formatted(LocalDate.now());

        String createRes = mockMvc.perform(post("/api/v1/diet/logs")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String logId = objectMapper.readTree(createRes).get("data").get("id").asText();

        mockMvc.perform(put("/api/v1/diet/logs/" + logId + "/feedback")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"energyRating\":3,\"hungerAfterRating\":2,\"digestionStatus\":\"OK\"}"))
                .andExpect(status().isOk());

        UUID clientId = userRepository.findByEmail("customer1@gmail.com").map(User::getId).orElseThrow();

        mockMvc.perform(get("/api/v1/workspace/progress/" + clientId)
                        .with(asUser("pt.certified@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.postMealAggregate").isArray());
    }
}
