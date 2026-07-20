package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PtClientMappingResponse {
    private UUID id;
    private UUID ptId;
    private String ptName;
    private String ptAvatarUrl;
    private UUID clientId;
    private String clientName;
    private String clientAvatarUrl;
    private ClientMappingStatus status;
    private LocalDateTime assignedAt;
    private String endRequestedBy;
    private String selectedTrainingMode;
    private BigDecimal agreedAmount;
    private String agreedRateUnit;
    private LocalDateTime acceptedAt;
    private LocalDateTime paymentDueAt;
    private LocalDateTime coachingStartedAt;


    public static PtClientMappingResponse toMappingResponse(PtClientMapping mapping) {
        User pt = mapping.getPt();
        User client = mapping.getClient();
        return PtClientMappingResponse.builder()
                .id(mapping.getId())
                .ptId(pt.getId())
                .ptName(pt.getFullName())
                .ptAvatarUrl(pt.getAvatarUrl())
                .clientId(client.getId())
                .clientName(client.getFullName())
                .clientAvatarUrl(client.getAvatarUrl())
                .status(mapping.getStatus())
                .assignedAt(mapping.getAssignedAt())
                .endRequestedBy(mapping.getEndRequestedBy() != null ? mapping.getEndRequestedBy().name() : null)
                .selectedTrainingMode(mapping.getSelectedTrainingMode() != null
                        ? mapping.getSelectedTrainingMode().name() : null)
                .agreedAmount(mapping.getAgreedAmount())
                .agreedRateUnit(mapping.getAgreedRateUnit())
                .acceptedAt(mapping.getAcceptedAt())
                .paymentDueAt(mapping.getPaymentDueAt())
                .coachingStartedAt(mapping.getCoachingStartedAt())
                .build();
    }
}
