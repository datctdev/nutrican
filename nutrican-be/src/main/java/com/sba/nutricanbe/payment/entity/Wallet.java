package com.sba.nutricanbe.payment.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.payment.enums.WalletType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "coaching_wallets", uniqueConstraints = {
        @UniqueConstraint(name = "uk_coaching_wallet_owner_type", columnNames = {"owner_id", "wallet_type"}),
        @UniqueConstraint(name = "uk_coaching_wallet_key", columnNames = "wallet_key")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class Wallet extends BaseEntity {

    @Column(name = "owner_id")
    private UUID ownerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "wallet_type", nullable = false, length = 20)
    private WalletType walletType;

    @Column(name = "wallet_key", nullable = false, length = 80)
    private String walletKey;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "VND";

    @Column(name = "available_balance", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal availableBalance = BigDecimal.ZERO;

    @Column(name = "locked_balance", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal lockedBalance = BigDecimal.ZERO;

    @Version
    private Long version;

    @PrePersist
    @PreUpdate
    private void assignWalletKey() {
        walletKey = ownerId == null
                ? "SYSTEM:" + walletType.name()
                : "USER:" + ownerId + ":" + walletType.name();
    }

    public void addAvailable(BigDecimal amount) {
        availableBalance = availableBalance.add(amount);
    }

    public void subtractAvailable(BigDecimal amount) {
        if (availableBalance.compareTo(amount) < 0) {
            throw new IllegalStateException("Insufficient available wallet balance");
        }
        availableBalance = availableBalance.subtract(amount);
    }

    public void addLocked(BigDecimal amount) {
        lockedBalance = lockedBalance.add(amount);
    }

    public void subtractLocked(BigDecimal amount) {
        if (lockedBalance.compareTo(amount) < 0) {
            throw new IllegalStateException("Insufficient locked wallet balance");
        }
        lockedBalance = lockedBalance.subtract(amount);
    }
}
