package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.entity.PtAppointment;
import com.sba.nutricanbe.user.enums.AppointmentCancelType;
import com.sba.nutricanbe.user.enums.AppointmentStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class AppointmentResponse {
    private UUID id;
    private UUID clientId;
    private UUID ptId;
    private UUID mappingId;
    private UUID mappingSessionId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String type;
    private String note;
    private AppointmentStatus status;
    private String cancelledBy;
    private AppointmentCancelType cancelType;
    private String cancelReason;
    private String venueName;
    private String venueAddress;
    private String venueMapsUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    /** Số tiền đã hoàn về ví học viên khi hủy (0 nếu không hoàn). */
    private BigDecimal refundedAmount;

    public static AppointmentResponse from(PtAppointment a) {
        return from(a, null);
    }

    public static AppointmentResponse from(PtAppointment a, BigDecimal refundedAmount) {
        if (a == null) {
            return null;
        }
        return AppointmentResponse.builder()
                .id(a.getId())
                .clientId(a.getClientId())
                .ptId(a.getPtId())
                .mappingId(a.getMappingId())
                .mappingSessionId(a.getMappingSessionId())
                .startTime(a.getStartTime())
                .endTime(a.getEndTime())
                .type(a.getType())
                .note(a.getNote())
                .status(a.getStatus())
                .cancelledBy(a.getCancelledBy())
                .cancelType(a.getCancelType())
                .cancelReason(a.getCancelReason())
                .venueName(a.getVenueName())
                .venueAddress(a.getVenueAddress())
                .venueMapsUrl(a.getVenueMapsUrl())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .refundedAmount(refundedAmount != null ? refundedAmount : BigDecimal.ZERO)
                .build();
    }
}
