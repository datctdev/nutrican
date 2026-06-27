package com.sba.nutricanbe.workspace.config;

import com.sba.nutricanbe.workspace.handler.WorkspaceWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final WorkspaceWebSocketHandler workspaceWebSocketHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Đăng ký URL /ws/workspace và cho phép frontend (CORS) kết nối vào
        registry.addHandler(workspaceWebSocketHandler, "/ws/workspace")
                .setAllowedOrigins("*");
    }
}