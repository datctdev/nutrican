package com.sba.nutricanbe.user.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;

import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.CoachingEndRequestedBy;
import com.sba.nutricanbe.user.enums.TrainingMode;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.math.BigDecimal;

@Entity
@Table(name = "pt_client_mappings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@ToString(exclude = {"pt", "client"})
public class PtClientMapping extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pt_id", nullable = false)
    private User pt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private User client;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private ClientMappingStatus status = ClientMappingStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "selected_training_mode", length = 20)
    private TrainingMode selectedTrainingMode;

    @Column(name = "agreed_amount", precision = 15, scale = 2)
    private BigDecimal agreedAmount;

    @Column(name = "agreed_rate_unit", length = 30)
    private String agreedRateUnit;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "payment_due_at")
    private LocalDateTime paymentDueAt;

    @Column(name = "coaching_started_at")
    private LocalDateTime coachingStartedAt;

    @CreationTimestamp
    @Column(name = "assigned_at", updatable = false)
    private LocalDateTime assignedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "end_requested_by", length = 20)
    private CoachingEndRequestedBy endRequestedBy;

    @Column(name = "end_requested_at")
    private LocalDateTime endRequestedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "termination_reason", length = 30)
    private com.sba.nutricanbe.user.enums.TerminationReason terminationReason;
}

