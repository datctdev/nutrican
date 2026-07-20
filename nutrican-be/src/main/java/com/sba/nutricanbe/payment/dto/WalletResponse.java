package com.sba.nutricanbe.payment.dto;

import com.sba.nutricanbe.payment.entity.Wallet;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class WalletResponse {
    private UUID id;
    private String walletType;
    private String currency;
    private BigDecimal availableBalance;
    private BigDecimal lockedBalance;

    public static WalletResponse from(Wallet wallet) {
        return WalletResponse.builder()
                .id(wallet.getId())
                .walletType(wallet.getWalletType().name())
                .currency(wallet.getCurrency())
                .availableBalance(wallet.getAvailableBalance())
                .lockedBalance(wallet.getLockedBalance())
                .build();
    }
}
