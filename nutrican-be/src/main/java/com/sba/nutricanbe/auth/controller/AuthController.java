package com.sba.nutricanbe.auth.controller;

import com.sba.nutricanbe.auth.dto.AuthResponse;
import com.sba.nutricanbe.auth.dto.ForgotPasswordRequest;
import com.sba.nutricanbe.auth.dto.GoogleAuthRequest;
import com.sba.nutricanbe.auth.dto.LoginRequest;
import com.sba.nutricanbe.auth.dto.RegisterRequest;
import com.sba.nutricanbe.auth.dto.RegisterResponse;
import com.sba.nutricanbe.auth.dto.ResendVerificationRequest;
import com.sba.nutricanbe.auth.dto.ResetPasswordRequest;
import com.sba.nutricanbe.auth.dto.SetPasswordRequest;
import com.sba.nutricanbe.auth.dto.VerifyEmailRequest;
import com.sba.nutricanbe.auth.service.AuthService;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.user.entity.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<RegisterResponse>> registerCustomer(
            @Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.registerCustomer(request));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyEmail(
            @Valid @RequestBody VerifyEmailRequest request) {
        return ResponseEntity.ok(authService.verifyEmail(request.token()));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Void> resendVerification(
            @Valid @RequestBody ResendVerificationRequest request) {
        authService.resendVerificationEmail(request.email());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {
        return ResponseEntity.ok(authService.login(request, response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            HttpServletRequest request,
            HttpServletResponse response) {
        return ResponseEntity.ok(authService.refreshToken(request, response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest request,
            HttpServletResponse response) {
        String accessToken = extractBearerToken(authorization);
        return ResponseEntity.ok(authService.logout(accessToken, request, response));
    }

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<AuthResponse>> googleAuth(
            @Valid @RequestBody GoogleAuthRequest request) {
        return ResponseEntity.ok(authService.googleAuth(request));
    }

    @PostMapping("/set-password")
    public ResponseEntity<ApiResponse<AuthResponse>> setPassword(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody SetPasswordRequest request) {
        return ResponseEntity.ok(authService.setPassword(user.getId(), request));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.sendPasswordResetEmail(request.email());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok(ApiResponse.success(null, "Password reset successfully"));
    }

    private String extractBearerToken(String authorization) {
        if (StringUtils.hasText(authorization) && authorization.startsWith("Bearer ")) {
            return authorization.substring(7);
        }
        return null;
    }
}
