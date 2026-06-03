package com.sba.nutrican_be.auth.controller;

import com.sba.nutrican_be.auth.dto.*;
import com.sba.nutrican_be.auth.service.AuthService;
import com.sba.nutrican_be.auth.service.KycService;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final KycService kycService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> registerCustomer(
            @Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.registerCustomer(request));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refreshToken(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        return ResponseEntity.ok(ApiResponse.success(null, "Logout successful"));
    }

    @PostMapping("/kyc")
    public ResponseEntity<ApiResponse<Void>> submitKyc(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody KycRequest request) {
        return ResponseEntity.ok(kycService.submitKyc(user.getId(), request));
    }

    @GetMapping("/kyc/status")
    public ResponseEntity<ApiResponse<KycStatusDto>> getKycStatus(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(kycService.getKycStatus(user.getId()));
    }

    @PostMapping("/pt/request")
    public ResponseEntity<ApiResponse<Void>> requestPt(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody PtRequestDto request) {
        return ResponseEntity.ok(kycService.requestPt(user.getId(), request));
    }
}
