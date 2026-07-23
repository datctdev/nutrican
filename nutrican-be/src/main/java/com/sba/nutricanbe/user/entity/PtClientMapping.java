package com.sba.nutricanbe.user.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;

import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.CoachingEndRequestedBy;
import com.sba.nutricanbe.user.enums.CoachingEvaluation;
import com.sba.nutricanbe.user.enums.CoachingHealthStatus;
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

    /** Online coaching period end (typically startedAt + 1 month). */
    @Column(name = "period_ends_at")
    private LocalDateTime periodEndsAt;

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


    @Column(name = "venue_id")
    private java.util.UUID venueId;

    @Column(name = "venue_name", length = 120)
    private String venueName;

    @Column(name = "venue_address", length = 500)
    private String venueAddress;

    @Column(name = "venue_maps_url", length = 500)
    private String venueMapsUrl;

    @Column(name = "first_session_start")
    private LocalDateTime firstSessionStart;

    @Column(name = "first_session_end")
    private LocalDateTime firstSessionEnd;

    @Column(name = "session_count")
    private Integer sessionCount;

    @Column(name = "per_session_amount", precision = 15, scale = 2)
    private BigDecimal perSessionAmount;

    /** PT-confirmed coaching health badge; null = not yet confirmed (show suggested). */
    @Enumerated(EnumType.STRING)
    @Column(name = "coaching_status", length = 20)
    private CoachingHealthStatus coachingStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "coaching_evaluation", length = 20)
    private CoachingEvaluation coachingEvaluation;

    @Column(name = "coaching_eval_note", length = 500)
    private String coachingEvalNote;

    @Column(name = "coaching_eval_updated_at")
    private LocalDateTime coachingEvalUpdatedAt;
}

