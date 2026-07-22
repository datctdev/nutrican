package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.entity.PtConductReport;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class PtConductReportResponse {
    private UUID id;
    private UUID mappingId;
    private UUID customerId;
    private UUID ptId;
    private String customerName;
    private String ptName;
    private String reason;
    private String status;
    private String adminNote;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;

    public static PtConductReportResponse from(PtConductReport report) {
        return from(report, null, null);
    }

    public static PtConductReportResponse from(PtConductReport report, String customerName, String ptName) {
        return PtConductReportResponse.builder()
                .id(report.getId())
                .mappingId(report.getMappingId())
                .customerId(report.getCustomerId())
                .ptId(report.getPtId())
                .customerName(customerName)
                .ptName(ptName)
                .reason(report.getReason())
                .status(report.getStatus() != null ? report.getStatus().name() : null)
                .adminNote(report.getAdminNote())
                .resolvedAt(report.getResolvedAt())
                .createdAt(report.getCreatedAt())
                .build();
    }
}
