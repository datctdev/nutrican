package com.sba.nutricanbe.integration;

import com.sba.nutricanbe.diet.enums.AllergenType;
import com.sba.nutricanbe.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class MealPlanIntegrationTest extends IntegrationTestBase {

    @BeforeEach
    void setUp() {
        stubAiAndStorage();
        User customer = userRepository.findByEmail("customer1@gmail.com").orElseThrow();
        customer.setAllergens(List.of(AllergenType.SEAFOOD));
        userRepository.save(customer);
    }

    @Test
    void ptCreatePlan_returnsAllergyWarnings() throws Exception {
        UUID clientId = userRepository.findByEmail("customer1@gmail.com").map(User::getId).orElseThrow();

        String payload = String.format("""
                {
                  "clientId": "%s",
                  "weekStart": "%s",
                  "items": [
                    {
                      "planDate": "%s",
                      "mealType": "LUNCH",
                      "foodCode": "ca_kho_to",
                      "portionGrams": 200
                    }
                  ]
                }
                """, clientId, java.time.LocalDate.now(), java.time.LocalDate.now());

        mockMvc.perform(post("/api/v1/workspace/meal-plans")
                        .with(asUser("pt.certified@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.allergyWarnings").isArray())
                .andExpect(jsonPath("$.data.allergyWarnings[0].foodCode").value("ca_kho_to"));
    }

    @Test
    void customerSuggest_ptApprove_updatesMealPlan() throws Exception {
        UUID clientId = userRepository.findByEmail("customer1@gmail.com").map(User::getId).orElseThrow();
        LocalDate today = java.time.LocalDate.now();

        String planPayload = String.format("""
                {
                  "clientId": "%s",
                  "weekStart": "%s",
                  "items": [
                    {
                      "planDate": "%s",
                      "mealType": "LUNCH",
                      "foodCode": "com_trang",
                      "freeText": "Cơm trắng",
                      "portionGrams": 300
                    }
                  ]
                }
                """, clientId, today, today);

        mockMvc.perform(post("/api/v1/workspace/meal-plans")
                        .with(asUser("pt.certified@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(planPayload))
                .andExpect(status().isOk());

        String currentRes = mockMvc.perform(get("/api/v1/meal-plans/current")
                        .with(asUser("customer1@gmail.com")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String itemId = objectMapper.readTree(currentRes).get("data").get("items").get(0).get("id").asText();

        mockMvc.perform(post("/api/v1/meal-plans/items/" + itemId + "/suggest")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"suggestedFoodName\":\"Phở bò\",\"suggestedGram\":350}"))
                .andExpect(status().isOk());

        String pendingRes = mockMvc.perform(get("/api/v1/workspace/clients/" + clientId + "/meal-plan-suggestions")
                        .with(asUser("pt.certified@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].suggestedFoodName").value("Phở bò"))
                .andReturn().getResponse().getContentAsString();

        String suggestionId = objectMapper.readTree(pendingRes).get("data").get(0).get("id").asText();

        mockMvc.perform(put("/api/v1/workspace/meal-plan-suggestions/" + suggestionId)
                        .with(asUser("pt.certified@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"APPROVE\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/meal-plans/current")
                        .with(asUser("customer1@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].freeText").value("Phở bò"));
    }
}
