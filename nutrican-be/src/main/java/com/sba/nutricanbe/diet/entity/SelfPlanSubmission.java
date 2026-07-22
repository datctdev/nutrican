package com.sba.nutricanbe.diet.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.diet.enums.SelfPlanSubmissionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "self_plan_submissions", indexes = {
        @Index(name = "idx_self_plan_submission_customer_date", columnList = "customer_id, plan_date"),
        @Index(name = "idx_self_plan_submission_pt_status", columnList = "pt_id, status")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class SelfPlanSubmission extends BaseEntity {

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "pt_id", nullable = false)
    private UUID ptId;

    @Column(name = "plan_date", nullable = false)
    private LocalDate planDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SelfPlanSubmissionStatus status = SelfPlanSubmissionStatus.PENDING;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @Column(name = "pt_note", columnDefinition = "TEXT")
    private String ptNote;


    @Column(name = "pending_unique_key", unique = true, length = 80)
    private String pendingUniqueKey;
}
