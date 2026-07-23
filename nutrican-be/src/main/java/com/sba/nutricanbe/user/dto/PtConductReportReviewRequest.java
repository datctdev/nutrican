package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.PtConductReportStatus;
import lombok.Data;

@Data
public class PtConductReportReviewRequest {
    /** REVIEWED hoặc DISMISSED */
    private PtConductReportStatus status;
    private String adminNote;
    /** Chỉ hợp lệ khi status = REVIEWED */
    private boolean suspendPt;
    /** Số ngày khóa; null = vô thời hạn. Hợp lệ: 7, 14, 30. */
    private Integer suspendDays;
    /** Chỉ hợp lệ khi DISMISSED */
    private boolean falseReport;
    /** Chỉ hợp lệ khi DISMISSED + falseReport */
    private boolean suspendReporter;
    private Integer suspendReporterDays;
}
