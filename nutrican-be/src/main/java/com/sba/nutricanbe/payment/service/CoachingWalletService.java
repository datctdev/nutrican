package com.sba.nutricanbe.payment.service;

import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.payment.dto.WalletResponse;
import com.sba.nutricanbe.payment.dto.WalletTransactionResponse;
import com.sba.nutricanbe.payment.entity.Payment;
import com.sba.nutricanbe.payment.enums.WalletType;

import java.util.UUID;

public interface CoachingWalletService {
    void holdSuccessfulPayment(Payment payment);

    void releaseEscrow(UUID mappingId);

    boolean releaseEscrowIfPresent(UUID mappingId);

    boolean refundEscrowIfPresent(UUID mappingId);

    boolean markEscrowDisputedIfPresent(UUID mappingId);

    boolean rejectEscrowDisputeIfPresent(UUID mappingId);

    WalletResponse getWallet(UUID userId);

    WalletResponse getSystemWallet(WalletType type);

    PageResponse<WalletTransactionResponse> getTransactions(UUID userId, int page, int size);

    PageResponse<WalletTransactionResponse> getSystemTransactions(
            WalletType type, int page, int size);
}
