package com.sba.nutrican_be.auth.controller;

import com.sba.nutrican_be.auth.dto.KycRequest;
import com.sba.nutrican_be.auth.dto.KycStatusDto;
import com.sba.nutrican_be.auth.service.KycService;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/kyc")
@RequiredArgsConstructor
public class KycController {

    private final KycService kycService;

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> submitKyc(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody KycRequest request) {
        return ResponseEntity.ok(kycService.submitKyc(user.getId(), request));
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<KycStatusDto>> getKycStatus(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(kycService.getKycStatus(user.getId()));
    }
}
