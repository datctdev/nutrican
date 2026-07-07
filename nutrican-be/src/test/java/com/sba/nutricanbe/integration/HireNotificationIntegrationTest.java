package com.sba.nutricanbe.integration;

import com.sba.nutricanbe.infrastructure.mail.MailService;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.NotificationRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class HireNotificationIntegrationTest extends IntegrationTestBase {

    @Autowired private NotificationRepository notificationRepository;
    @MockitoBean private MailService mailService;

    @Test
    void ptAcceptHire_createsNotificationAndSendsEmail() throws Exception {
        User customer = userRepository.findByEmail("customer2@gmail.com").orElseThrow();
        UUID customerId = customer.getId();

        mockMvc.perform(put("/api/v1/workspace/clients/{clientId}/hire-request", customerId)
                        .with(asUser("pt.freelance@gmail.com"))
                        .param("action", "ACCEPT"))
                .andExpect(status().isOk());

        var notifications = notificationRepository.findByUser_IdOrderByCreatedAtDesc(
                customerId, PageRequest.of(0, 10));
        assertThat(notifications.getContent())
                .anyMatch(n -> "HIRE_ACCEPTED".equals(n.getType()));

        verify(mailService).sendNotificationEmail(
                eq(customer.getEmail()), anyString(), anyString(), anyString(), eq("hire-result"));
    }

    @Test
    void ptAcceptHire_skipsEmailWhenOptedOut() throws Exception {
        User customer = userRepository.findByEmail("customer2@gmail.com").orElseThrow();
        UUID customerId = customer.getId();
        Map<String, Boolean> optIn = new HashMap<>();
        optIn.put("hireResultEmail", false);
        customer.setNotificationOptIn(optIn);
        userRepository.save(customer);

        mockMvc.perform(put("/api/v1/workspace/clients/{clientId}/hire-request", customerId)
                        .with(asUser("pt.freelance@gmail.com"))
                        .param("action", "ACCEPT"))
                .andExpect(status().isOk());

        var notifications = notificationRepository.findByUser_IdOrderByCreatedAtDesc(
                customerId, PageRequest.of(0, 10));
        assertThat(notifications.getContent())
                .anyMatch(n -> "HIRE_ACCEPTED".equals(n.getType()));

        verify(mailService, never()).sendNotificationEmail(
                eq(customer.getEmail()), anyString(), anyString(), anyString(), eq("hire-result"));
    }
}
