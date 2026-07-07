package com.sba.nutricanbe.integration;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SecurityIntegrationTest extends IntegrationTestBase {

    @Test
    void customerCannotAccessAdminRefunds() throws Exception {
        mockMvc.perform(get("/api/v1/admin/refunds")
                        .with(asUser("customer1@gmail.com")))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedCannotAccessWorkspace() throws Exception {
        int status = mockMvc.perform(get("/api/v1/workspace/clients"))
                .andReturn().getResponse().getStatus();
        assertTrue(status == 401 || status == 403, "Expected 401/403 but got " + status);
    }
}
