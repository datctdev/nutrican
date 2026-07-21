package com.sba.nutricanbe.payment.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.payment.dto.WalletResponse;
import com.sba.nutricanbe.payment.dto.WalletTransactionResponse;
import com.sba.nutricanbe.payment.dto.WithdrawRequest;
import com.sba.nutricanbe.payment.service.CoachingWalletService;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.payment.enums.WalletType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/coaching-wallet")
@RequiredArgsConstructor
public class CoachingWalletController {

    private final CoachingWalletService walletService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<WalletResponse>> getMyWallet(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(walletService.getWallet(user.getId())));
    }

    @PostMapping("/me/withdraw")
    public ResponseEntity<ApiResponse<WalletResponse>> withdraw(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody WithdrawRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                walletService.withdraw(user.getId(), request), "Rút tiền thành công"));
    }

    @GetMapping("/me/transactions")
    public ResponseEntity<ApiResponse<PageResponse<WalletTransactionResponse>>> getMyTransactions(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                walletService.getTransactions(user.getId(), page, size)));
    }

    @GetMapping("/admin/system")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<WalletResponse>> getSystemWallet(
            @RequestParam WalletType type) {
        return ResponseEntity.ok(ApiResponse.success(walletService.getSystemWallet(type)));
    }

    @GetMapping("/admin/system/transactions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<WalletTransactionResponse>>> getSystemTransactions(
            @RequestParam WalletType type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                walletService.getSystemTransactions(type, page, size)));
    }
}
