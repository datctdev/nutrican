package com.sba.nutricanbe.payment.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.payment.enums.CoachingPaymentMethod;
import com.sba.nutricanbe.payment.enums.CoachingPaymentPurpose;
import com.sba.nutricanbe.payment.enums.CoachingPaymentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "coaching_payments", indexes = {
        @Index(name = "idx_coaching_payment_mapping", columnList = "mapping_id"),
        @Index(name = "idx_coaching_payment_order_number", columnList = "order_number", unique = true)
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class Payment extends BaseEntity {

    @Column(name = "mapping_id", nullable = false)
    private UUID mappingId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CoachingPaymentMethod method;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CoachingPaymentStatus status;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    @Builder.Default
    private CoachingPaymentPurpose purpose = CoachingPaymentPurpose.HIRE;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "VND";

    @Column(name = "txn_ref", nullable = false, unique = true, length = 100)
    private String txnRef;

    @Column(name = "order_number", nullable = false, unique = true, length = 50)
    private String orderNumber;

    @Column(name = "provider_txn_no", length = 100)
    private String providerTxnNo;

    @Column(name = "provider_response_code", length = 20)
    private String providerResponseCode;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
