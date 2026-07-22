package com.sba.nutricanbe.payment.dto;

import com.sba.nutricanbe.payment.entity.WalletTransaction;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class WalletTransactionResponse {
    private UUID id;
    private String direction;
    private String type;
    private String status;
    private BigDecimal amount;
    private String referenceType;
    private UUID referenceId;
    private String note;
    private LocalDateTime createdAt;

    public static WalletTransactionResponse from(WalletTransaction transaction, UUID walletId) {
        boolean incoming = transaction.getToWallet() != null
                && transaction.getToWallet().getId().equals(walletId);
        boolean outgoing = transaction.getFromWallet() != null
                && transaction.getFromWallet().getId().equals(walletId);
        String direction = incoming && outgoing ? "INTERNAL" : incoming ? "IN" : "OUT";
        return WalletTransactionResponse.builder()
                .id(transaction.getId())
                .direction(direction)
                .type(transaction.getType().name())
                .status(transaction.getStatus().name())
                .amount(transaction.getAmount())
                .referenceType(transaction.getReferenceType())
                .referenceId(transaction.getReferenceId())
                .note(transaction.getNote())
                .createdAt(transaction.getCreatedAt())
                .build();
    }

    public static WalletTransactionResponse fromAdmin(WalletTransaction transaction) {
        return WalletTransactionResponse.builder()
                .id(transaction.getId())
                .direction("LEDGER")
                .type(transaction.getType().name())
                .status(transaction.getStatus().name())
                .amount(transaction.getAmount())
                .referenceType(transaction.getReferenceType())
                .referenceId(transaction.getReferenceId())
                .note(transaction.getNote())
                .createdAt(transaction.getCreatedAt())
                .build();
    }
}
