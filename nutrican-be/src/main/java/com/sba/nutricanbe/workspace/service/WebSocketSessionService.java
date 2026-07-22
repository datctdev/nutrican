package com.sba.nutricanbe.workspace.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sba.nutricanbe.user.service.NotificationService;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
public class WebSocketSessionService {

    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;

    public WebSocketSessionService(
            ObjectMapper objectMapper,
            @Lazy com.sba.nutricanbe.user.service.NotificationService notificationService) {
        this.objectMapper = objectMapper;
        this.notificationService = notificationService;
    }
    private final Map<UUID, CopyOnWriteArrayList<WebSocketSession>> sessions = new ConcurrentHashMap<>();

    public void registerSession(UUID userId, WebSocketSession session) {
        sessions.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(session);
        log.info("Registered WebSocket session for User [{}]. Total sessions: {}", userId, sessions.get(userId).size());
    }

    public void removeSession(UUID userId, WebSocketSession session) {
        CopyOnWriteArrayList<WebSocketSession> userSessions = sessions.get(userId);
        if (userSessions != null) {
            userSessions.remove(session);
            if (userSessions.isEmpty()) {
                sessions.remove(userId);
            }
            log.info("Removed WebSocket session for User [{}].", userId);
        }
    }

    public void sendToUser(UUID userId, String event, Object data) {
        sendToUserOnly(userId, event, data);
        try {
            notificationService.recordFromWebSocketEvent(userId, event, data);
        } catch (Exception e) {
            log.warn("Failed to persist notification for user {} event {}", userId, event, e);
        }
    }

    public void sendToUserOnly(UUID userId, String event, Object data) {
        CopyOnWriteArrayList<WebSocketSession> userSessions = sessions.get(userId);
        if (userSessions == null || userSessions.isEmpty()) {
            return;
        }

        try {
            WebSocketMessage message = WebSocketMessage.builder()
                    .event(event)
                    .data(data)
                    .build();
            String jsonPayload = objectMapper.writeValueAsString(message);
            TextMessage textMessage = new TextMessage(jsonPayload);

            for (WebSocketSession session : userSessions) {
                if (session.isOpen()) {
                    try {
                        session.sendMessage(textMessage);
                    } catch (IOException e) {
                        log.error("Failed to send WebSocket message to session [{}] of User [{}]", session.getId(), userId, e);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error serializing WebSocket message for User [{}]", userId, e);
        }
    }

    public void notifyPtOfNewDietLog(UUID ptId, Object dietLogInfo) {
        sendToUser(ptId, "NEW_DIET_LOG", dietLogInfo);
    }

    @Data
    @Builder
    public static class WebSocketMessage {
        private String event;
        private Object data;
    }
}
