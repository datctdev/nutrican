package com.sba.nutricanbe.integration;

import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.TerminationReason;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CoachingLifecycleIntegrationTest extends IntegrationTestBase {

    @Autowired private PtClientMappingRepository mappingRepository;
    @Autowired private PtProfileRepository ptProfileRepository;

    @Test
    void hireAcceptBlockedWhenPtAtMaxClients() throws Exception {
        User pt = userRepository.findByEmail("pt.certified@gmail.com").orElseThrow();
        User customer2 = userRepository.findByEmail("customer2@gmail.com").orElseThrow();

        var profile = ptProfileRepository.findByUserId(pt.getId()).orElseThrow();
        profile.setMaxClients(1);
        ptProfileRepository.save(profile);

        mockMvc.perform(post("/api/v1/marketplace/pts/{ptId}/hire", pt.getId())
                        .with(asUser("customer2@gmail.com")))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/v1/workspace/clients/{clientId}/hire-request", customer2.getId())
                        .with(asUser("pt.certified@gmail.com"))
                        .param("action", "ACCEPT"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void hireBlockedWhenCustomerHasActivePt() throws Exception {
        User freelance = userRepository.findByEmail("pt.freelance@gmail.com").orElseThrow();
        mockMvc.perform(post("/api/v1/marketplace/pts/{ptId}/hire", freelance.getId())
                        .with(asUser("customer1@gmail.com")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void endCoaching_ptRequestCustomerConfirm_completes() throws Exception {
        User customer = userRepository.findByEmail("customer1@gmail.com").orElseThrow();
        UUID customerId = customer.getId();

        mockMvc.perform(post("/api/v1/workspace/clients/{clientId}/end-coaching", customerId)
                        .with(asUser("pt.certified@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("END_REQUESTED"));

        mockMvc.perform(put("/api/v1/profile/end-coaching/confirm")
                        .with(asUser("customer1@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));

        var mapping = mappingRepository.findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(
                userRepository.findByEmail("pt.certified@gmail.com").orElseThrow().getId(),
                customerId).orElseThrow();
        assertThat(mapping.getStatus()).isEqualTo(ClientMappingStatus.COMPLETED);
        assertThat(mapping.getTerminationReason()).isEqualTo(TerminationReason.NORMAL_COMPLETION);
    }

    @Test
    void autoApprovedRefund_setsTerminationReasonRefund() throws Exception {
        User customer = userRepository.findByEmail("customer1@gmail.com").orElseThrow();
        User pt = userRepository.findByEmail("pt.certified@gmail.com").orElseThrow();
        var mapping = mappingRepository
                .findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(pt.getId(), customer.getId()).orElseThrow();

        String body = String.format("""
                {"mappingId":"%s","reason":"PT_CANCEL","note":"pt cancelled session"}
                """, mapping.getId());

        mockMvc.perform(post("/api/v1/refunds")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        var updated = mappingRepository.findById(mapping.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(ClientMappingStatus.INACTIVE);
        assertThat(updated.getTerminationReason()).isEqualTo(TerminationReason.REFUND);
    }

    @Test
    void ptCannotViewProgressAfterRefund() throws Exception {
        User customer = userRepository.findByEmail("customer1@gmail.com").orElseThrow();
        User pt = userRepository.findByEmail("pt.certified@gmail.com").orElseThrow();
        var mapping = mappingRepository
                .findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(pt.getId(), customer.getId()).orElseThrow();

        String body = String.format("""
                {"mappingId":"%s","reason":"PT_CANCEL","note":"refund test"}
                """, mapping.getId());

        mockMvc.perform(post("/api/v1/refunds")
                        .with(asUser("customer1@gmail.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/workspace/progress/" + customer.getId())
                        .with(asUser("pt.certified@gmail.com")))
                .andExpect(status().isUnauthorized());
    }
}
