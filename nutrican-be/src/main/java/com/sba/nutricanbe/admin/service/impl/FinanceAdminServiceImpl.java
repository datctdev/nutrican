package com.sba.nutricanbe.admin.service.impl;

import com.sba.nutricanbe.admin.dto.FinanceOverviewDto;
import com.sba.nutricanbe.admin.service.FinanceAdminService;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.common.service.SystemSettingService;
import com.sba.nutricanbe.payment.dto.WalletResponse;
import com.sba.nutricanbe.payment.dto.WalletTransactionResponse;
import com.sba.nutricanbe.payment.enums.CoachingEscrowStatus;
import com.sba.nutricanbe.payment.enums.WalletTransactionType;
import com.sba.nutricanbe.payment.enums.WalletType;
import com.sba.nutricanbe.payment.repository.CoachingEscrowRepository;
import com.sba.nutricanbe.payment.repository.WalletTransactionRepository;
import com.sba.nutricanbe.payment.service.CoachingWalletService;
import com.sba.nutricanbe.user.service.MappingSessionConfirmService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FinanceAdminServiceImpl implements FinanceAdminService {

    private final CoachingWalletService walletService;
    private final WalletTransactionRepository transactionRepository;
    private final CoachingEscrowRepository escrowRepository;
    private final MappingSessionConfirmService mappingSessionConfirmService;
    private final SystemSettingService systemSettingService;

    @Override
    @Transactional(readOnly = true)
    public FinanceOverviewDto getOverview(LocalDateTime from, LocalDateTime to) {
        WalletResponse escrow = walletService.getSystemWallet(WalletType.ESCROW);
        WalletResponse platform = walletService.getSystemWallet(WalletType.PLATFORM);
        return FinanceOverviewDto.builder()
                .escrowLockedBalance(escrow.getLockedBalance())
                .platformAvailableBalance(platform.getAvailableBalance())
                .totalCommission(nullToZero(transactionRepository.sumSuccessByTypeInRange(
                        WalletTransactionType.COMMISSION, from, to)))
                .totalRefunds(nullToZero(transactionRepository.sumSuccessByTypeInRange(
                        WalletTransactionType.REFUND, from, to)))
                .totalWithdrawals(nullToZero(transactionRepository.sumSuccessByTypeInRange(
                        WalletTransactionType.WITHDRAWAL, from, to)))
                .totalPayments(nullToZero(transactionRepository.sumSuccessByTypeInRange(
                        WalletTransactionType.PAYMENT, from, to)))
                .heldEscrowCount(escrowRepository.countByStatusIn(
                        List.of(CoachingEscrowStatus.HELD, CoachingEscrowStatus.PARTIALLY_RELEASED)))
                .disputedEscrowCount(escrowRepository.countByStatus(CoachingEscrowStatus.DISPUTED))
                .pendingSessionDisputeCount(mappingSessionConfirmService.countPendingDisputes())
                .platformFeeRate(systemSettingService.getPlatformFeeRate())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<WalletTransactionResponse> getTransactions(
            WalletTransactionType type, LocalDateTime from, LocalDateTime to, int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            size = 20;
            page = Math.max(page, 0);
        }
        var result = transactionRepository
                .findAll(WalletTransactionRepository.adminLedgerSpec(type, from, to), PageRequest.of(page, size))
                .map(WalletTransactionResponse::fromAdmin);
        return PageResponse.from(result);
    }

    private static BigDecimal nullToZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
