package com.sba.nutricanbe.workspace.handler;

import com.sba.nutricanbe.common.util.JwtUtil;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class WorkspaceWebSocketHandler extends TextWebSocketHandler {

    private final JwtUtil jwtUtil;
    private final WebSocketSessionService sessionService;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        try {
            // Lấy token từ query param: ws://localhost:8080/ws/workspace?token=...
            String query = session.getUri().getQuery();
            String token = UriComponentsBuilder.fromUriString("?" + query).build().getQueryParams().getFirst("token");

            if (token == null || !jwtUtil.validateToken(token)) {
                log.warn("WebSocket connection rejected: Invalid or missing token.");
                session.close(CloseStatus.POLICY_VIOLATION);
                return;
            }

            UUID userId = jwtUtil.getUserIdFromToken(token);

            // Lưu UserId vào attribute của session để dùng lúc ngắt kết nối
            session.getAttributes().put("USER_ID", userId);

            sessionService.registerSession(userId, session);

        } catch (Exception e) {
            log.error("WebSocket connection error", e);
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        UUID userId = (UUID) session.getAttributes().get("USER_ID");
        if (userId != null) {
            sessionService.removeSession(userId, session);
        }
    }
}