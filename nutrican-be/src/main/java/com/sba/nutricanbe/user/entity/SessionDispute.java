package com.sba.nutricanbe.user.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.user.enums.SessionDisputeDecision;
import com.sba.nutricanbe.user.enums.SessionDisputeStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "session_disputes")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class SessionDispute extends BaseEntity {

    @Column(name = "session_id", nullable = false, unique = true)
    private UUID sessionId;

    @Column(name = "mapping_id", nullable = false)
    private UUID mappingId;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "pt_id", nullable = false)
    private UUID ptId;

    @Column(nullable = false, length = 1000)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SessionDisputeStatus status = SessionDisputeStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "admin_decision", length = 20)
    private SessionDisputeDecision adminDecision;

    @Column(name = "pt_amount", precision = 15, scale = 2)
    private BigDecimal ptAmount;

    @Column(name = "customer_amount", precision = 15, scale = 2)
    private BigDecimal customerAmount;

    @Column(name = "admin_note", length = 1000)
    private String adminNote;

    /** Latest PT reply snapshot for quick list views (full thread in messages). */
    @Column(name = "pt_note", length = 1000)
    private String ptNote;

    @Column(name = "pt_responded_at")
    private LocalDateTime ptRespondedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}
