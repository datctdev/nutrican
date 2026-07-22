package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.entity.SessionDisputeMessage;
import com.sba.nutricanbe.user.enums.SessionDisputeAuthorRole;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class SessionDisputeMessageResponse {
    private UUID id;
    private UUID disputeId;
    private UUID authorId;
    private String authorRole;
    private String authorName;
    private String body;
    private LocalDateTime createdAt;

    public static SessionDisputeMessageResponse from(SessionDisputeMessage message, String authorName) {
        SessionDisputeAuthorRole role = message.getAuthorRole();
        return SessionDisputeMessageResponse.builder()
                .id(message.getId())
                .disputeId(message.getDisputeId())
                .authorId(message.getAuthorId())
                .authorRole(role != null ? role.name() : null)
                .authorName(authorName)
                .body(message.getBody())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
