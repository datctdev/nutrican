package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.entity.RefundRequest;
import com.sba.nutricanbe.user.enums.RefundReason;
import com.sba.nutricanbe.user.enums.RefundStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class RefundResponse {
    private UUID id;
    private UUID mappingId;
    private UUID customerId;
    private UUID ptId;
    private RefundReason reason;
    private RefundStatus status;
    private String note;
    private String adminNote;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static RefundResponse from(RefundRequest r) {
        if (r == null) {
            return null;
        }
        return RefundResponse.builder()
                .id(r.getId())
                .mappingId(r.getMappingId())
                .customerId(r.getCustomerId())
                .ptId(r.getPtId())
                .reason(r.getReason())
                .status(r.getStatus())
                .note(r.getNote())
                .adminNote(r.getAdminNote())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}
