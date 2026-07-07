package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.user.dto.NotificationDto;
import com.sba.nutricanbe.user.dto.NotificationPayload;

import java.util.UUID;

public interface NotificationService {

    void notify(UUID userId, NotificationPayload payload);

    void recordFromWebSocketEvent(UUID userId, String event, Object data);

    ApiResponse<PageResponse<NotificationDto>> list(UUID userId, int page, int size, Boolean unreadOnly);

    ApiResponse<Long> unreadCount(UUID userId);

    ApiResponse<Void> markRead(UUID userId, UUID notificationId);

    ApiResponse<Void> markAllRead(UUID userId);
}
