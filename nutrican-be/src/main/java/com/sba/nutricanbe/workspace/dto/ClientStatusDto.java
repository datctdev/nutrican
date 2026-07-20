package com.sba.nutricanbe.workspace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClientStatusDto {
    private UUID clientId;
    private String clientName;
    private String avatarUrl;
    private String status;
    private String statusLabel;
    private String statusColor;
    private String mappingStatus;
    private String lastLogTime;
    private java.math.BigDecimal avgCalories;
    private String endRequestedBy;
    private String selectedTrainingMode;
    private java.math.BigDecimal agreedAmount;
    private String agreedRateUnit;
    private java.time.LocalDateTime paymentDueAt;
    private UUID venueId;
    private String venueName;
    private String venueAddress;
    private String venueMapsUrl;
    private java.time.LocalDateTime firstSessionStart;
    private java.time.LocalDateTime firstSessionEnd;
    private Integer sessionCount;
    private java.math.BigDecimal perSessionAmount;
    private java.util.List<com.sba.nutricanbe.user.dto.MappingSessionResponse> sessions;
}
