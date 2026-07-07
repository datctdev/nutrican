package com.sba.nutricanbe.integration;

import com.sba.nutricanbe.user.entity.Notification;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class NotificationIntegrationTest extends IntegrationTestBase {

    @Autowired private NotificationRepository notificationRepository;

    @Test
    void markAllRead_clearsUnreadCount() throws Exception {
        User customer = userRepository.findByEmail("customer1@gmail.com").orElseThrow();
        notificationRepository.save(Notification.builder()
                .user(customer)
                .type("TEST")
                .title("Test")
                .body("Body")
                .message("Body")
                .isRead(false)
                .build());

        mockMvc.perform(get("/api/v1/notifications/unread-count")
                        .with(asUser("customer1@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(org.hamcrest.Matchers.greaterThan(0)));

        mockMvc.perform(put("/api/v1/notifications/read-all")
                        .with(asUser("customer1@gmail.com")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/notifications/unread-count")
                        .with(asUser("customer1@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(0));

        long unread = notificationRepository.countByUser_IdAndIsRead(customer.getId(), false);
        assertThat(unread).isZero();
    }

    @Test
    void bodyMetricReminderStatus_returnsBoolean() throws Exception {
        mockMvc.perform(get("/api/v1/profile/body-metric-reminder-status")
                        .with(asUser("customer1@gmail.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.showReminder").isBoolean());
    }
}
