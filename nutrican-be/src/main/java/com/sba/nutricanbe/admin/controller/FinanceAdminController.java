package com.sba.nutricanbe.admin.controller;

import com.sba.nutricanbe.admin.dto.FinanceOverviewDto;
import com.sba.nutricanbe.common.dto.ApiResponse;
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
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/finance")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class FinanceAdminController {

    private final CoachingWalletService walletService;
    private final WalletTransactionRepository transactionRepository;
    private final CoachingEscrowRepository escrowRepository;
    private final MappingSessionConfirmService mappingSessionConfirmService;
    private final SystemSettingService systemSettingService;

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<FinanceOverviewDto>> overview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        WalletResponse escrow = walletService.getSystemWallet(WalletType.ESCROW);
        WalletResponse platform = walletService.getSystemWallet(WalletType.PLATFORM);
        FinanceOverviewDto dto = FinanceOverviewDto.builder()
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
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<PageResponse<WalletTransactionResponse>>> transactions(
            @RequestParam(required = false) WalletTransactionType type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (page < 0 || size < 1 || size > 100) {
            size = 20;
            page = Math.max(page, 0);
        }
        var result = transactionRepository
                .findAll(WalletTransactionRepository.adminLedgerSpec(type, from, to), PageRequest.of(page, size))
                .map(WalletTransactionResponse::fromAdmin);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(result)));
    }

    private BigDecimal nullToZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
