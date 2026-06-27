package com.sba.nutricanbe.chat.controller;

import com.sba.nutricanbe.chat.dto.ChatMessageRequest;
import com.sba.nutricanbe.chat.dto.ChatMessageResponse;
import com.sba.nutricanbe.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessageRequest request, Principal principal) {
        if (principal == null) {
            throw new IllegalArgumentException("Unauthenticated WebSocket session");
        }
        UUID senderId = UUID.fromString(principal.getName());
        ChatMessageResponse response = chatService.sendMessage(senderId, request);
        messagingTemplate.convertAndSend("/topic/chats/" + response.getMappingId(), response);
    }
}
