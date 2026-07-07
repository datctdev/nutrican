package com.sba.nutricanbe.integration;

import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.RefundReason;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RefundIntegrationTest extends IntegrationTestBase {

    @Autowired private PtClientMappingRepository mappingRepository;

    @Test
    void customerRefundWithin7Days_isPendingReview() throws Exception {
        User customer = userRepository.findByEmail("customer1@gmail.com").orElseThrow();
        User pt = userRepository.findByEmail("pt.certified@gmail.com").orElseThrow();
        PtClientMapping mapping = mappingRepository.findByPt_IdAndClient_Id(pt.getId(), customer.getId()).orElseThrow();
        ReflectionTestUtils.setField(mapping, "createdAt", LocalDateTime.now().minusDays(2));
        mappingRepository.save(mapping);

        String body = String.format("""
                {"mappingId":"%s","reason":"CUSTOMER_REQUEST","note":"test refund"}
                """, mapping.getId());

        mockMvc.perform(post("/api/v1/refunds")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING_REVIEW"))
                .andExpect(jsonPath("$.data.reason").value(RefundReason.CUSTOMER_REQUEST.name()));
    }
}
