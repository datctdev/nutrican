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
import java.util.List;
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

    private UUID venueId;
    private String venueName;
    private String venueAddress;
    private String venueMapsUrl;
    private LocalDateTime firstSessionStart;
    private LocalDateTime firstSessionEnd;

    private Integer sessionCount;
    private BigDecimal perSessionAmount;
    private List<MappingSessionResponse> sessions;


    public static PtClientMappingResponse toMappingResponse(PtClientMapping mapping) {
        return toMappingResponse(mapping, List.of());
    }

    public static PtClientMappingResponse toMappingResponse(
            PtClientMapping mapping, List<MappingSessionResponse> sessions) {
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
                .venueId(mapping.getVenueId())
                .venueName(mapping.getVenueName())
                .venueAddress(mapping.getVenueAddress())
                .venueMapsUrl(mapping.getVenueMapsUrl())
                .firstSessionStart(mapping.getFirstSessionStart())
                .firstSessionEnd(mapping.getFirstSessionEnd())
                .sessionCount(mapping.getSessionCount())
                .perSessionAmount(mapping.getPerSessionAmount())
                .sessions(sessions)
                .build();
    }
}
