package com.sba.nutrican_be.admin.controller;

import com.sba.nutrican_be.admin.dto.PendingKycDto;
import com.sba.nutrican_be.admin.service.KycAdminService;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/kyc")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class KycAdminController {

    private final KycAdminService kycAdminService;

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<PageResponse<PendingKycDto>>> getPendingKycs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(kycAdminService.getPendingKycs(page, size));
    }

    @PutMapping("/{userId}/approve")
    public ResponseEntity<ApiResponse<Void>> approveKyc(@PathVariable UUID userId) {
        return ResponseEntity.ok(kycAdminService.approveKyc(userId));
    }

    @PutMapping("/{userId}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectKyc(
            @PathVariable UUID userId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(kycAdminService.rejectKyc(userId, body.get("reason")));
    }
}
