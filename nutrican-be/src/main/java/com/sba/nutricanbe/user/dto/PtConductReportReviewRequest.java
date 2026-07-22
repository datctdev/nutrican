package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.PtConductReportStatus;
import lombok.Data;

@Data
public class PtConductReportReviewRequest {
    /** REVIEWED hoặc DISMISSED */
    private PtConductReportStatus status;
    private String adminNote;
}
