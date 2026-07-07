package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.entity.Notification;
import com.sba.nutricanbe.user.enums.NotificationLinkType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class NotificationDto {
    private UUID id;
    private String type;
    private String title;
    private String body;
    private String message;
    private NotificationLinkType linkType;
    private UUID linkRefId;
    private Boolean isRead;
    private LocalDateTime createdAt;

    public static NotificationDto from(Notification n) {
        return NotificationDto.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .body(n.getBody())
                .message(n.getMessage() != null ? n.getMessage() : n.getBody())
                .linkType(n.getLinkType())
                .linkRefId(n.getLinkRefId())
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
