package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.user.dto.RefundCreateRequest;
import com.sba.nutricanbe.user.dto.RefundResponse;
import com.sba.nutricanbe.user.dto.RefundReviewRequest;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.service.RefundService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class RefundController {

    private final RefundService refundService;

    @PostMapping("/api/v1/refunds")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<RefundResponse>> requestRefund(
            @AuthenticationPrincipal User customer,
            @RequestBody RefundCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                RefundResponse.from(refundService.requestRefund(customer.getId(), request)),
                "Refund request submitted"));
    }

    @GetMapping("/api/v1/admin/refunds")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<RefundResponse>>> listRefunds() {
        return ResponseEntity.ok(ApiResponse.success(
                refundService.listAll().stream().map(RefundResponse::from).toList()));
    }

    @PutMapping("/api/v1/admin/refunds/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RefundResponse>> reviewRefund(
            @PathVariable UUID id,
            @RequestBody RefundReviewRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                RefundResponse.from(refundService.review(id, request))));
    }
}
