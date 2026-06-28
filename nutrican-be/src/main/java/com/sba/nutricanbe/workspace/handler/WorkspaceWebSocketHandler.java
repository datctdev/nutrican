package com.sba.nutricanbe.workspace.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sba.nutricanbe.chat.dto.ChatMessageRequest;
import com.sba.nutricanbe.chat.dto.ChatMessageResponse;
import com.sba.nutricanbe.chat.service.ChatService;
import com.sba.nutricanbe.common.util.JwtUtil;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class WorkspaceWebSocketHandler extends TextWebSocketHandler {

    private static final String USER_ID_ATTRIBUTE = "USER_ID";
    private static final String CHAT_SEND_EVENT = "CHAT_SEND";
    private static final String CHAT_MESSAGE_EVENT = "CHAT_MESSAGE";
    private static final String ERROR_EVENT = "ERROR";

    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper;
    private final ChatService chatService;
    private final WebSocketSessionService sessionService;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        try {
            String query = session.getUri() != null ? session.getUri().getQuery() : null;
            String token = UriComponentsBuilder.fromUriString("?" + (query != null ? query : ""))
                    .build()
                    .getQueryParams()
                    .getFirst("token");

            if (token == null || !jwtUtil.validateToken(token)) {
                log.warn("WebSocket connection rejected: invalid or missing token");
                session.close(CloseStatus.POLICY_VIOLATION);
                return;
            }

            UUID userId = jwtUtil.getUserIdFromToken(token);
            session.getAttributes().put(USER_ID_ATTRIBUTE, userId);
            sessionService.registerSession(userId, session);
        } catch (Exception e) {
            log.error("WebSocket connection error", e);
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        UUID senderId = (UUID) session.getAttributes().get(USER_ID_ATTRIBUTE);
        if (senderId == null) {
            sendError(session, "Unauthenticated WebSocket session");
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        try {
            JsonNode root = objectMapper.readTree(message.getPayload());
            String event = root.path("event").asText(null);

            if (CHAT_SEND_EVENT.equals(event)) {
                handleChatSend(senderId, root.path("data"));
                return;
            }

            sendError(session, "Unsupported WebSocket event: " + event);
        } catch (Exception e) {
            log.warn("Failed to handle WebSocket message from user [{}]: {}", senderId, e.getMessage());
            sendError(session, e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        UUID userId = (UUID) session.getAttributes().get(USER_ID_ATTRIBUTE);
        if (userId != null) {
            sessionService.removeSession(userId, session);
        }
    }

    private void handleChatSend(UUID senderId, JsonNode data) {
        ChatMessageRequest request = objectMapper.convertValue(data, ChatMessageRequest.class);
        ChatMessageResponse response = chatService.sendMessage(senderId, request);

        sessionService.sendToUser(senderId, CHAT_MESSAGE_EVENT, response);
        if (!senderId.equals(response.getRecipientId())) {
            sessionService.sendToUser(response.getRecipientId(), CHAT_MESSAGE_EVENT, response);
        }
    }

    private void sendError(WebSocketSession session, String message) throws Exception {
        if (!session.isOpen()) {
            return;
        }

        WebSocketSessionService.WebSocketMessage error = WebSocketSessionService.WebSocketMessage.builder()
                .event(ERROR_EVENT)
                .data(message)
                .build();
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(error)));
    }
}
