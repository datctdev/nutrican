package com.sba.nutricanbe.diet.dto.response;

import com.sba.nutricanbe.diet.entity.SelfPlanSubmission;
import com.sba.nutricanbe.diet.enums.SelfPlanSubmissionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SelfPlanSubmissionResponse {
    private UUID id;
    private UUID customerId;
    private UUID ptId;
    private LocalDate planDate;
    private SelfPlanSubmissionStatus status;
    private LocalDateTime submittedAt;
    private LocalDateTime decidedAt;
    private String ptNote;
    private List<SelfPlanItemResponse> items;

    public static SelfPlanSubmissionResponse from(SelfPlanSubmission submission) {
        return SelfPlanSubmissionResponse.builder()
                .id(submission.getId())
                .customerId(submission.getCustomerId())
                .ptId(submission.getPtId())
                .planDate(submission.getPlanDate())
                .status(submission.getStatus())
                .submittedAt(submission.getSubmittedAt())
                .decidedAt(submission.getDecidedAt())
                .ptNote(submission.getPtNote())
                .build();
    }

    public static SelfPlanSubmissionResponse from(SelfPlanSubmission submission, List<SelfPlanItemResponse> items) {
        SelfPlanSubmissionResponse response = from(submission);
        response.setItems(items);
        return response;
    }
}
