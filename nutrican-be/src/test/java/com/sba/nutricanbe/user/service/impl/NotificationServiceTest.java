package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.infrastructure.mail.MailService;
import com.sba.nutricanbe.user.dto.NotificationPayload;
import com.sba.nutricanbe.user.entity.Notification;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.repository.NotificationRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private UserRepository userRepository;
    @Mock private WebSocketSessionService webSocketSessionService;
    @Mock private MailService mailService;
    @Mock private ObjectMapper objectMapper;
    @InjectMocks private NotificationServiceImpl service;

    @Test
    void notify_persistsAndPushesUnreadCount() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().email("a@b.com").fullName("A").build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(notificationRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(notificationRepository.countByUser_IdAndIsRead(userId, false)).thenReturn(3L);

        service.notify(userId, NotificationPayload.builder()
                .type("TEST")
                .title("T")
                .body("B")
                .sendEmail(false)
                .build());

        verify(notificationRepository).save(any(Notification.class));
        verify(webSocketSessionService).sendToUserOnly(eq(userId), eq("NOTIFICATION_COUNT"), any());
    }

    @Test
    void unreadCount_returnsRepositoryCount() {
        UUID userId = UUID.randomUUID();
        when(notificationRepository.countByUser_IdAndIsRead(userId, false)).thenReturn(5L);
        assertThat(service.unreadCount(userId).getData()).isEqualTo(5L);
    }

    @Test
    void markAllRead_delegatesToRepository() {
        UUID userId = UUID.randomUUID();
        service.markAllRead(userId);
        verify(notificationRepository).markAllAsReadByUserId(userId);
    }
}
