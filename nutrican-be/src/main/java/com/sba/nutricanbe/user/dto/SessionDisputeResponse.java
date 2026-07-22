package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.entity.SessionDispute;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class SessionDisputeResponse {
    private UUID id;
    private UUID sessionId;
    private UUID mappingId;
    private UUID customerId;
    private UUID ptId;
    private String customerName;
    private String ptName;
    private Integer sequence;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String venueName;
    private String venueAddress;
    private BigDecimal perSessionAmount;
    private String reason;
    private String status;
    private String adminDecision;
    private BigDecimal ptAmount;
    private BigDecimal customerAmount;
    private String adminNote;
    private String ptNote;
    private LocalDateTime ptRespondedAt;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;
    @Builder.Default
    private List<SessionDisputeMessageResponse> messages = new ArrayList<>();

    public static SessionDisputeResponse from(SessionDispute dispute) {
        return SessionDisputeResponse.builder()
                .id(dispute.getId())
                .sessionId(dispute.getSessionId())
                .mappingId(dispute.getMappingId())
                .customerId(dispute.getCustomerId())
                .ptId(dispute.getPtId())
                .reason(dispute.getReason())
                .status(dispute.getStatus() != null ? dispute.getStatus().name() : null)
                .adminDecision(dispute.getAdminDecision() != null ? dispute.getAdminDecision().name() : null)
                .ptAmount(dispute.getPtAmount())
                .customerAmount(dispute.getCustomerAmount())
                .adminNote(dispute.getAdminNote())
                .ptNote(dispute.getPtNote())
                .ptRespondedAt(dispute.getPtRespondedAt())
                .resolvedAt(dispute.getResolvedAt())
                .createdAt(dispute.getCreatedAt())
                .messages(new ArrayList<>())
                .build();
    }
}
