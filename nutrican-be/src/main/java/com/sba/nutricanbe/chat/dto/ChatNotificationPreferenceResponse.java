package com.sba.nutricanbe.chat.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class ChatNotificationPreferenceResponse {
    private UUID mappingId;
    private UUID participantId;
    private boolean enabled;
}
