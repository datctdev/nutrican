package com.sba.nutricanbe.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sba.nutricanbe.ai.dto.FoodGatePreCheckResult;
import com.sba.nutricanbe.ai.dto.MealRecognitionResult;
import com.sba.nutricanbe.ai.service.FoodGateService;
import com.sba.nutricanbe.ai.service.MealRecognitionService;
import com.sba.nutricanbe.diet.enums.FoodGateResult;
import com.sba.nutricanbe.infrastructure.service.RateLimitingService;
import com.sba.nutricanbe.infrastructure.storage.StorageService;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public abstract class IntegrationTestBase {

    @Autowired protected WebApplicationContext webApplicationContext;
    @Autowired protected ObjectMapper objectMapper;
    @Autowired protected UserRepository userRepository;

    protected MockMvc mockMvc;

    @MockitoBean protected RateLimitingService rateLimitingService;
    @MockitoBean protected MealRecognitionService mealRecognitionService;
    @MockitoBean protected FoodGateService foodGateService;
    @MockitoBean protected StorageService storageService;

    @BeforeEach
    void initMockMvc() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
    }

    protected void stubAiAndStorage() {
        when(storageService.uploadFile(any(), anyString())).thenReturn("test-object");
        when(storageService.getPresignedUrl(anyString())).thenReturn("http://localhost/test.jpg");
        when(foodGateService.preCheck(any())).thenReturn(
                new FoodGatePreCheckResult(FoodGateResult.PASS, null));
        when(mealRecognitionService.recognizeMealFromFile(any(), any(), any(), any(), any()))
                .thenReturn(MealRecognitionResult.builder()
                        .foodCode("pho")
                        .foodName("Pho")
                        .confidenceScore(BigDecimal.valueOf(0.9))
                        .estimatedTotalGrams(BigDecimal.valueOf(400))
                        .calories(BigDecimal.valueOf(450))
                        .protein(BigDecimal.valueOf(25))
                        .carbs(BigDecimal.valueOf(60))
                        .fat(BigDecimal.valueOf(10))
                        .needsConfirmation(false)
                        .build());
        when(mealRecognitionService.recognizeMealFromFile(any(), any(), any(), any()))
                .thenReturn(MealRecognitionResult.builder()
                        .foodCode("pho")
                        .foodName("Pho")
                        .confidenceScore(BigDecimal.valueOf(0.9))
                        .estimatedTotalGrams(BigDecimal.valueOf(400))
                        .calories(BigDecimal.valueOf(450))
                        .protein(BigDecimal.valueOf(25))
                        .carbs(BigDecimal.valueOf(60))
                        .fat(BigDecimal.valueOf(10))
                        .needsConfirmation(false)
                        .build());
    }

    protected RequestPostProcessor asUser(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken(
                user,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
        return authentication(token);
    }

    protected String login(String email, String password) throws Exception {
        String body = String.format("{\"email\":\"%s\",\"password\":\"%s\"}", email, password);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
        return data.get("accessToken").asText();
    }

    protected MockMultipartFile sampleImage() {
        return new MockMultipartFile("file", "meal.jpg", "image/jpeg", new byte[]{1, 2, 3});
    }
}
