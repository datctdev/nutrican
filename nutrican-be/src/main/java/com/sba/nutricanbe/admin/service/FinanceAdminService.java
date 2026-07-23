package com.sba.nutricanbe.admin.service;

import com.sba.nutricanbe.admin.dto.FinanceOverviewDto;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.payment.dto.WalletTransactionResponse;
import com.sba.nutricanbe.payment.enums.WalletTransactionType;

import java.time.LocalDateTime;

public interface FinanceAdminService {

    FinanceOverviewDto getOverview(LocalDateTime from, LocalDateTime to);

    PageResponse<WalletTransactionResponse> getTransactions(
            WalletTransactionType type, LocalDateTime from, LocalDateTime to, int page, int size);
}
