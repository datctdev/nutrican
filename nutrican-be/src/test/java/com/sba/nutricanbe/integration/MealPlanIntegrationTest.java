package com.sba.nutricanbe.integration;

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
        customer.setAllergyNotes("ca_kho_to");
        userRepository.save(customer);
    }

    @Test
    void ptCreatePlan_success() throws Exception {
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
                .andExpect(status().isOk());
    }

    @Test
    void ptHasReadyToUseSampleMealPlanTemplates() throws Exception {
        String templateResponse = mockMvc.perform(get("/api/v1/workspace/templates")
                        .with(asUser("pt.certified@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(3))
                .andExpect(jsonPath("$.data[*].name").value(org.hamcrest.Matchers.hasItems(
                        "Giảm mỡ 1.500 kcal - 7 ngày",
                        "Cân bằng 1.800 kcal - 7 ngày",
                        "Tăng cơ 2.200 kcal - Giàu đạm")))
                .andReturn().getResponse().getContentAsString();

        String templateId = null;
        for (com.fasterxml.jackson.databind.JsonNode template : objectMapper.readTree(templateResponse).get("data")) {
            if ("Giảm mỡ 1.500 kcal - 7 ngày".equals(template.get("name").asText())) {
                templateId = template.get("id").asText();
                break;
            }
        }
        if (templateId == null) {
            throw new AssertionError("Sample fat-loss template not found");
        }

        UUID clientId = userRepository.findByEmail("customer1@gmail.com").map(User::getId).orElseThrow();
        UUID ptId = userRepository.findByEmail("pt.certified@gmail.com").map(User::getId).orElseThrow();
        LocalDate weekStart = LocalDate.of(2020, 1, 6);

        mockMvc.perform(post("/api/v1/workspace/clients/" + clientId + "/apply-template/" + templateId)
                        .with(asUser("pt.certified@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"weekStart\":\"" + weekStart + "\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/workspace/meal-plans/" + clientId)
                        .with(asUser("pt.certified@gmail.com"))
                        .param("weekStart", weekStart.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plan.ptId").value(ptId.toString()))
                .andExpect(jsonPath("$.data.items.length()").value(83));

        mockMvc.perform(get("/api/v1/foods/by-codes")
                        .with(asUser("pt.certified@gmail.com"))
                        .param("codes", "gao lut,thit ga rung"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));
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

        String postRes = mockMvc.perform(post("/api/v1/workspace/meal-plans")
                        .with(asUser("pt.certified@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(planPayload))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String planId = objectMapper.readTree(postRes).get("data").get("plan").get("id").asText();

        mockMvc.perform(post("/api/v1/workspace/meal-plans/" + planId + "/publish")
                        .with(asUser("pt.certified@gmail.com")))
                .andExpect(status().isOk());

        String currentRes = mockMvc.perform(get("/api/v1/meal-plans/current")
                        .with(asUser("customer1@gmail.com")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String itemId = objectMapper.readTree(currentRes).get("data").get("items").get(0).get("id").asText();

        mockMvc.perform(post("/api/v1/meal-plans/items/" + itemId + "/suggest")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"suggestedFoodName\":\"Phở bò\",\"suggestedFoodCode\":\"pho\",\"suggestedGram\":350,\"reason\":\"EQUIVALENT\"}"))
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

    @Test
    void customerCanChooseBetweenCurrentAndNextPublishedWeek() throws Exception {
        UUID clientId = userRepository.findByEmail("customer1@gmail.com").map(User::getId).orElseThrow();
        LocalDate currentWeek = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        LocalDate nextWeek = currentWeek.plusWeeks(1);

        createAndPublishPlan(clientId, currentWeek, "Thực đơn tuần này");
        createAndPublishPlan(clientId, nextWeek, "Thực đơn tuần sau");

        mockMvc.perform(get("/api/v1/meal-plans/weeks")
                        .with(asUser("customer1@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].weekStart").value(org.hamcrest.Matchers.hasItems(
                        currentWeek.toString(), nextWeek.toString())));

        mockMvc.perform(get("/api/v1/meal-plans/current")
                        .with(asUser("customer1@gmail.com"))
                        .param("weekStart", currentWeek.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plan.weekStart").value(currentWeek.toString()))
                .andExpect(jsonPath("$.data.items[0].freeText").value("Thực đơn tuần này"));

        mockMvc.perform(get("/api/v1/meal-plans/current")
                        .with(asUser("customer1@gmail.com"))
                        .param("weekStart", nextWeek.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plan.weekStart").value(nextWeek.toString()))
                .andExpect(jsonPath("$.data.items[0].freeText").value("Thực đơn tuần sau"));
    }

    @Test
    void customerMealItemActions_followExclusiveBusinessStates() throws Exception {
        UUID clientId = userRepository.findByEmail("customer1@gmail.com").map(User::getId).orElseThrow();
        LocalDate today = LocalDate.now();
        createAndPublishPlan(clientId, today, "Ức gà");

        String planResponse = mockMvc.perform(get("/api/v1/meal-plans/current")
                        .with(asUser("customer1@gmail.com"))
                        .param("weekStart", today.toString()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String itemId = objectMapper.readTree(planResponse).get("data").get("items").get(0).get("id").asText();

        mockMvc.perform(put("/api/v1/meal-plans/items/" + itemId + "/skip")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"skipReason\":\"DONT_LIKE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.skipReason").value("DONT_LIKE"));

        mockMvc.perform(put("/api/v1/meal-plans/items/" + itemId + "/eaten")
                        .with(asUser("customer1@gmail.com"))
                        .param("eaten", "true"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/v1/meal-plans/items/" + itemId + "/unskip")
                        .with(asUser("customer1@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.skipReason").doesNotExist());

        String suggestionResponse = mockMvc.perform(post("/api/v1/meal-plans/items/" + itemId + "/suggest")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"suggestedFoodName\":\"Cá hồi\",\"suggestedFoodCode\":\"ca hoi\",\"suggestedGram\":180,\"reason\":\"EQUIVALENT\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString();

        mockMvc.perform(post("/api/v1/meal-plans/items/" + itemId + "/suggest")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"suggestedFoodName\":\"Cá ngừ\",\"suggestedGram\":180,\"reason\":\"EQUIVALENT\"}"))
                .andExpect(status().isBadRequest());

        String suggestionId = objectMapper.readTree(suggestionResponse).get("data").get("id").asText();
        mockMvc.perform(put("/api/v1/meal-plans/suggestions/" + suggestionId + "/cancel")
                        .with(asUser("customer1@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));
    }

    private String createAndPublishPlan(UUID clientId, LocalDate weekStart, String freeText) throws Exception {
        String payload = String.format("""
                {
                  "clientId": "%s",
                  "weekStart": "%s",
                  "items": [
                    {
                      "planDate": "%s",
                      "mealType": "LUNCH",
                      "foodCode": "com_trang",
                      "freeText": "%s",
                      "portionGrams": 200
                    }
                  ]
                }
                """, clientId, weekStart, weekStart, freeText);

        String response = mockMvc.perform(post("/api/v1/workspace/meal-plans")
                        .with(asUser("pt.certified@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String planId = objectMapper.readTree(response).get("data").get("plan").get("id").asText();
        mockMvc.perform(post("/api/v1/workspace/meal-plans/" + planId + "/publish")
                        .with(asUser("pt.certified@gmail.com")))
                .andExpect(status().isOk());
        return planId;
    }
}
