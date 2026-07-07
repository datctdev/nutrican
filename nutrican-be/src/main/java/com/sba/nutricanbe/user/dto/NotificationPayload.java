package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.NotificationLinkType;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class NotificationPayload {
    private String type;
    private String title;
    private String body;
    private NotificationLinkType linkType;
    private UUID linkRefId;
    private boolean sendEmail;
    private String emailTemplate;
}
