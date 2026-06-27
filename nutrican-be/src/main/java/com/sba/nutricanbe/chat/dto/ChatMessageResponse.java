package com.sba.nutricanbe.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {
    private UUID id;
    private UUID mappingId;
    private UUID senderId;
    private String senderName;
    private String senderAvatarUrl;
    private UUID recipientId;
    private String recipientName;
    private String recipientAvatarUrl;
    private String content;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;
}
