package com.sba.nutricanbe.integration;

import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RecipeLogIntegrationTest extends IntegrationTestBase {

    @Autowired
    private FoodItemRepository foodItemRepository;

    @BeforeEach
    void setUp() {
        stubAiAndStorage();
    }

    @Test
    void createRecipe_thenLogFromRecipe() throws Exception {
        FoodItem rice = foodItemRepository.save(FoodItem.builder()
                .nameVi("Gạo test")
                .nameEn("rice_test")
                .calories(BigDecimal.valueOf(130))
                .protein(BigDecimal.valueOf(2.7))
                .carb(BigDecimal.valueOf(28))
                .fat(BigDecimal.valueOf(0.3))
                .servingSizeG(BigDecimal.valueOf(100))
                .build());
        UUID foodId = rice.getId();

        String recipeRes = mockMvc.perform(post("/api/v1/diet/recipes")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Cơm test",
                                  "ingredients": [
                                    {"foodItemId": "%s", "gram": 200}
                                  ]
                                }
                                """.formatted(foodId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCalories").exists())
                .andReturn().getResponse().getContentAsString();

        String recipeId = objectMapper.readTree(recipeRes).get("data").get("id").asText();

        mockMvc.perform(post("/api/v1/diet/logs")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "mealType": "DINNER",
                                  "recipeId": "%s",
                                  "logDate": "%s"
                                }
                                """.formatted(recipeId, LocalDate.now())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.recognitionSource").value("MANUAL_RECIPE"))
                .andExpect(jsonPath("$.data.mealComplexity").value("HOME_COOKED_RECIPE"));
    }
}
