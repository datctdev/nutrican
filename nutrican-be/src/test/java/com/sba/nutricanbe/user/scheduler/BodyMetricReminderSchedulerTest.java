package com.sba.nutricanbe.user.scheduler;

import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.user.dto.NotificationPayload;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.BodyMetricService;
import com.sba.nutricanbe.user.service.NotificationService;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BodyMetricReminderSchedulerTest {

    @Mock private UserRepository userRepository;
    @Mock private BodyMetricService bodyMetricService;
    @Mock private WebSocketSessionService webSocketSessionService;
    @Mock private NotificationService notificationService;
    @InjectMocks private BodyMetricReminderScheduler scheduler;

    @Test
    void sendWeeklyReminders_sendsWsAndPersistsNotificationWhenShouldRemind() {
        User user = User.builder().role(UserRole.CUSTOMER).build();
        UUID userId = UUID.randomUUID();
        ReflectionTestUtils.setField(user, "id", userId);
        when(userRepository.findByRole(eq(UserRole.CUSTOMER), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(user)));
        when(bodyMetricService.shouldRemind(user)).thenReturn(true);

        scheduler.sendWeeklyReminders();

        verify(webSocketSessionService).sendToUser(eq(userId), eq("BODY_METRIC_REMINDER"), any(Map.class));
        ArgumentCaptor<NotificationPayload> captor = ArgumentCaptor.forClass(NotificationPayload.class);
        verify(notificationService).notify(eq(userId), captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo("BODY_METRIC_REMINDER");
        assertThat(captor.getValue().getTitle()).isEqualTo("Nhắc ghi cân nặng");
    }

    @Test
    void sendWeeklyReminders_skipsWhenOptedOut() {
        User user = User.builder().role(UserRole.CUSTOMER).build();
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        when(userRepository.findByRole(eq(UserRole.CUSTOMER), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(user)));
        when(bodyMetricService.shouldRemind(user)).thenReturn(false);

        scheduler.sendWeeklyReminders();

        verify(webSocketSessionService, never()).sendToUser(any(), any(), any());
        verify(notificationService, never()).notify(any(), any());
    }
}
