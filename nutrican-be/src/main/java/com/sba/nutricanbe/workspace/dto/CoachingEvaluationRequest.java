package com.sba.nutricanbe.workspace.dto;

import lombok.Data;

@Data
public class CoachingEvaluationRequest {
    /** GREEN | YELLOW | RED */
    private String status;
    /** EXCELLENT | AVERAGE | POOR */
    private String evaluation;
    private String note;
}
