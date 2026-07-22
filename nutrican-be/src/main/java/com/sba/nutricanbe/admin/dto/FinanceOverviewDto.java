package com.sba.nutricanbe.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class FinanceOverviewDto {
    private BigDecimal escrowLockedBalance;
    private BigDecimal platformAvailableBalance;
    private BigDecimal totalCommission;
    private BigDecimal totalRefunds;
    private BigDecimal totalWithdrawals;
    private BigDecimal totalPayments;
    private long heldEscrowCount;
    private long disputedEscrowCount;
    private BigDecimal platformFeeRate;
}
