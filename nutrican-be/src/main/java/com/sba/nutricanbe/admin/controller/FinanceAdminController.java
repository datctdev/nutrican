package com.sba.nutricanbe.admin.controller;

import com.sba.nutricanbe.admin.dto.FinanceOverviewDto;
import com.sba.nutricanbe.admin.service.FinanceAdminService;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.payment.dto.WalletTransactionResponse;
import com.sba.nutricanbe.payment.enums.WalletTransactionType;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/admin/finance")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class FinanceAdminController {

    private final FinanceAdminService financeAdminService;

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<FinanceOverviewDto>> overview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(ApiResponse.success(financeAdminService.getOverview(from, to)));
    }

    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<PageResponse<WalletTransactionResponse>>> transactions(
            @RequestParam(required = false) WalletTransactionType type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                financeAdminService.getTransactions(type, from, to, page, size)));
    }
}
