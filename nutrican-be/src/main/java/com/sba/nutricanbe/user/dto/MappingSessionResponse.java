package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.entity.PtMappingSession;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MappingSessionResponse {

    private UUID id;
    private Integer sequence;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private UUID venueId;
    private String venueName;
    private String venueAddress;
    private String venueMapsUrl;
    private String status;
    private LocalDateTime ptMarkedDoneAt;
    private LocalDateTime customerRespondedAt;
    private LocalDateTime confirmDeadlineAt;
    private BigDecimal releasedAmount;

    public static MappingSessionResponse from(PtMappingSession session) {
        return MappingSessionResponse.builder()
                .id(session.getId())
                .sequence(session.getSequence())
                .startTime(session.getStartTime())
                .endTime(session.getEndTime())
                .venueId(session.getVenueId())
                .venueName(session.getVenueName())
                .venueAddress(session.getVenueAddress())
                .venueMapsUrl(session.getVenueMapsUrl())
                .status(session.getStatus() != null ? session.getStatus().name() : null)
                .ptMarkedDoneAt(session.getPtMarkedDoneAt())
                .customerRespondedAt(session.getCustomerRespondedAt())
                .confirmDeadlineAt(session.getConfirmDeadlineAt())
                .releasedAmount(session.getReleasedAmount())
                .build();
    }
}
