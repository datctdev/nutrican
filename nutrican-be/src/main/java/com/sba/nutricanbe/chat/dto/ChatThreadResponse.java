package com.sba.nutricanbe.chat.dto;

import com.sba.nutricanbe.user.enums.ClientMappingStatus;
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
public class ChatThreadResponse {
    private UUID mappingId;
    private UUID participantId;
    private String participantName;
    private String participantAvatarUrl;
    private ClientMappingStatus status;
    private ChatMessageResponse lastMessage;
    private long unreadCount;
    private LocalDateTime linkedAt;
    private String endRequestedBy;
    private String selectedTrainingMode;
    private java.math.BigDecimal perSessionAmount;
    private java.math.BigDecimal agreedAmount;
    private String agreedRateUnit;
    private Integer sessionCount;
    private String venueName;
    private LocalDateTime periodEndsAt;
    private UUID ptProfileId;
}
