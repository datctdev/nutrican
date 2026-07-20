package com.sba.nutricanbe.payment.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.payment.enums.CoachingEscrowStatus;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "coaching_escrows")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class CoachingEscrow extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mapping_id", nullable = false, unique = true)
    private PtClientMapping mapping;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_id", nullable = false, unique = true)
    private Payment payment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_wallet_id", nullable = false)
    private Wallet customerWallet;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pt_wallet_id", nullable = false)
    private Wallet ptWallet;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "escrow_wallet_id", nullable = false)
    private Wallet escrowWallet;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "platform_fee_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal platformFeeRate;

    @Column(name = "platform_fee_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal platformFeeAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CoachingEscrowStatus status;

    @Column(name = "released_at")
    private LocalDateTime releasedAt;
}
