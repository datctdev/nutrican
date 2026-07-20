package com.sba.nutricanbe.diet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Display-only reconciliation for day timeline (not {@code SubmissionReconciler} which writes DB).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DayTimelineReconciliation {
    private boolean offPlanIntake;
    private boolean planComplianceOnly;
    private boolean bothLogAndPlan;
    private String hintVi;
}
