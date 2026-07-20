package com.sba.nutricanbe.payment.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.payment.dto.CoachingPaymentResult;
import com.sba.nutricanbe.payment.dto.CreateCoachingPaymentResponse;
import com.sba.nutricanbe.payment.service.CoachingPaymentService;
import com.sba.nutricanbe.payment.service.CoachingWalletService;
import com.sba.nutricanbe.user.entity.User;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payment")
@RequiredArgsConstructor
public class CoachingPaymentController {

    private final CoachingPaymentService paymentService;
    private final CoachingWalletService walletService;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @PostMapping("/mappings/{mappingId}/vnpay")
    public ResponseEntity<ApiResponse<CreateCoachingPaymentResponse>> createVnPayPayment(
            @PathVariable UUID mappingId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(
                paymentService.createVnPayPayment(mappingId, user.getId())));
    }

    @GetMapping("/vnpay/return")
    public void handleVnPayReturn(
            @RequestParam Map<String, String> params,
            HttpServletResponse response) throws IOException {
        String paymentStatus = "failed";
        String mappingId = "";
        String message;
        try {
            CoachingPaymentResult result = paymentService.processVnPayCallback(params);
            paymentStatus = result.isSuccess() ? "success" : "failed";
            mappingId = result.getMappingId() != null ? result.getMappingId().toString() : "";
            message = result.getMessage();
        } catch (RuntimeException exception) {
            message = exception.getMessage() != null ? exception.getMessage() : "Payment processing failed";
        }

        String redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl)
                .path("/coaching")
                .queryParam("payment", paymentStatus)
                .queryParam("mappingId", mappingId)
                .queryParam("message", message)
                .build()
                .encode()
                .toUriString();
        response.sendRedirect(redirectUrl);
    }

    @PostMapping("/escrows/{mappingId}/release")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> adminReleaseEscrow(@PathVariable UUID mappingId) {
        walletService.releaseEscrow(mappingId);
        return ResponseEntity.ok(ApiResponse.success(null, "Escrow released"));
    }
}
