package com.sba.nutricanbe.user.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.user.enums.PtConductReportStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "pt_conduct_reports")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class PtConductReport extends BaseEntity {

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
    private PtConductReportStatus status = PtConductReportStatus.PENDING;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "evidence_object_names", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> evidenceObjectNames = new ArrayList<>();

    @Column(name = "pt_suspended", nullable = false)
    @Builder.Default
    private boolean ptSuspended = false;

    @Column(name = "false_report", nullable = false)
    @Builder.Default
    private boolean falseReport = false;

    /** Snapshot of PT suspend end time chosen at resolve (audit). */
    @Column(name = "suspend_until")
    private LocalDateTime suspendUntil;

    @Column(name = "admin_note", length = 1000)
    private String adminNote;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolved_by")
    private UUID resolvedBy;
}
