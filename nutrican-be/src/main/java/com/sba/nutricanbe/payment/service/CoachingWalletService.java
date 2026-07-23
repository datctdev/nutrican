package com.sba.nutricanbe.payment.service;

import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.payment.dto.WalletResponse;
import com.sba.nutricanbe.payment.dto.WalletTransactionResponse;
import com.sba.nutricanbe.payment.dto.WithdrawRequest;
import com.sba.nutricanbe.payment.entity.Payment;
import com.sba.nutricanbe.payment.enums.WalletType;

import java.math.BigDecimal;
import java.util.UUID;

public interface CoachingWalletService {
    void holdSuccessfulPayment(Payment payment);

    void holdFromWalletBalance(Payment payment);

    /** Add EXTRA_SESSIONS payment amount into existing escrow (VNPay credited then held). */
    void topUpEscrowFromVnPay(Payment payment);

    /** Add EXTRA_SESSIONS payment amount into existing escrow from customer wallet balance. */
    void topUpEscrowFromWallet(Payment payment);

    void releaseEscrow(UUID mappingId);

    boolean releaseEscrowIfPresent(UUID mappingId);

    boolean refundEscrowIfPresent(UUID mappingId);

    boolean markEscrowDisputedIfPresent(UUID mappingId);

    boolean rejectEscrowDisputeIfPresent(UUID mappingId);

    /** Release gross amount to PT (fee taken from PT share only). Rejects DISPUTED escrow. */
    void releaseToPt(UUID mappingId, BigDecimal grossAmount, String referenceType, UUID referenceId, String note);

    /** Refund gross amount to customer (no fee). Rejects DISPUTED escrow. */
    void refundToCustomer(UUID mappingId, BigDecimal grossAmount, String referenceType, UUID referenceId, String note);

    /** Split remaining: ptGross to PT (with fee), customerGross to customer. Rejects DISPUTED escrow. */
    void settleSplit(UUID mappingId, BigDecimal ptGross, BigDecimal customerGross,
                     String referenceType, UUID referenceId, String note);

    /**
     * Admin/dispute-only: release to PT even when escrow is DISPUTED.
     * Used by session dispute resolution — not for normal confirm/auto-confirm paths.
     */
    void forceReleaseToPt(UUID mappingId, BigDecimal grossAmount, String referenceType,
                          UUID referenceId, String note);

    /** Admin/dispute-only: refund to customer even when escrow is DISPUTED. */
    void forceRefundToCustomer(UUID mappingId, BigDecimal grossAmount, String referenceType,
                               UUID referenceId, String note);

    /** Admin/dispute-only: settle split even when escrow is DISPUTED. */
    void forceSettleSplit(UUID mappingId, BigDecimal ptGross, BigDecimal customerGross,
                          String referenceType, UUID referenceId, String note);

    /** Refund whatever remains in escrow to customer. Rejects DISPUTED escrow. */
    boolean refundRemainingIfPresent(UUID mappingId, String note);

    /**
     * Credit a successful VNPay payment into the customer's USER wallet without holding escrow.
     * Used when bank paid but coaching cannot be activated / fulfilled (late/cancelled).
     */
    void creditVnPayToCustomerWallet(Payment payment);

    WalletResponse getWallet(UUID userId);

    WalletResponse withdraw(UUID userId, WithdrawRequest request);

    WalletResponse getSystemWallet(WalletType type);

    PageResponse<WalletTransactionResponse> getTransactions(UUID userId, int page, int size);

    PageResponse<WalletTransactionResponse> getSystemTransactions(
            WalletType type, int page, int size);

    BigDecimal getRemainingEscrow(UUID mappingId);
}
