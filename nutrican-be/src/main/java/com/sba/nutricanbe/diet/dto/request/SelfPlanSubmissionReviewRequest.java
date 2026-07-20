package com.sba.nutricanbe.diet.dto.request;

import lombok.Data;

@Data
public class SelfPlanSubmissionReviewRequest {
    /** APPROVE | REJECT */
    private String action;
    private String ptNote;
}
