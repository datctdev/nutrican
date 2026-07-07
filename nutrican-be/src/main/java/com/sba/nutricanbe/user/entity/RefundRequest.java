package com.sba.nutricanbe.user.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.user.enums.RefundReason;
import com.sba.nutricanbe.user.enums.RefundStatus;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "refund_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class RefundRequest extends BaseEntity {

    @Column(name = "mapping_id", nullable = false)
    private UUID mappingId;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "pt_id", nullable = false)
    private UUID ptId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RefundReason reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private RefundStatus status = RefundStatus.PENDING_REVIEW;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;
}
