package com.sba.nutricanbe.workspace.service.impl;

import com.sba.nutricanbe.integration.IntegrationTestBase;
import com.sba.nutricanbe.user.entity.User;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ChatContextServiceTest extends IntegrationTestBase {

    @Test
    void getChatContext_returnsTodaySummaryForActiveClient() throws Exception {
        User customer = userRepository.findByEmail("customer1@gmail.com").orElseThrow();
        UUID clientId = customer.getId();

        mockMvc.perform(get("/api/v1/workspace/clients/{clientId}/chat-context", clientId)
                        .with(asUser("pt.certified@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.date").exists());
    }

    @Test
    void getChatContext_rejectsWhenNoActiveMapping() throws Exception {
        User customer = userRepository.findByEmail("customer2@gmail.com").orElseThrow();
        UUID clientId = customer.getId();

        mockMvc.perform(get("/api/v1/workspace/clients/{clientId}/chat-context", clientId)
                        .with(asUser("pt.certified@gmail.com")))
                .andExpect(status().isBadRequest());
    }
}
