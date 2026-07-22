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
    /** True when PT has confirmed coachingStatus on the mapping. */
    private boolean statusConfirmed;
    /** System suggestion from today's logs (GREEN/YELLOW/RED). */
    private String suggestedStatus;
    /** System suggestion (EXCELLENT/AVERAGE/POOR). */
    private String suggestedEvaluation;
    /** Confirmed evaluation when statusConfirmed; otherwise null. */
    private String evaluation;
    private String coachingEvalNote;
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
    /** Ngày bắt đầu coaching (neo tuần 7 ngày). */
    private java.time.LocalDateTime coachingStartedAt;
    private UUID mappingId;
}
