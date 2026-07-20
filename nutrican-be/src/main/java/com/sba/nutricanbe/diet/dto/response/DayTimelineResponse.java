package com.sba.nutricanbe.diet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DayTimelineResponse {
    private LocalDate date;
    private boolean hasPtPlan;
    private DayTimelineMacroBreakdown fromLogs;
    private DayTimelineMacroBreakdown fromCompliance;
    private DayTimelineMacroBreakdown pending;
    private DayTimelineMacroBreakdown targets;
    /** Primary self-plan submission for the date (PENDING preferred). */
    private SelfPlanSubmissionResponse selfPlanSubmission;
    @Builder.Default
    private List<DayTimelinePeriodResponse> periods = new ArrayList<>();
}
