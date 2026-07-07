package com.sba.nutricanbe;

import com.sba.nutricanbe.infrastructure.service.RateLimitingService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
@ActiveProfiles("test")
class NutricanBeApplicationTests {

    @MockitoBean
    private RateLimitingService rateLimitingService;

    @Test
    void contextLoads() {
    }
}
