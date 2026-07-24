package com.sba.nutricanbe.auth.service;

import com.sba.nutricanbe.auth.dto.AuthResponse;
import com.sba.nutricanbe.auth.dto.ChangePasswordRequest;
import com.sba.nutricanbe.auth.dto.GoogleAuthRequest;
import com.sba.nutricanbe.auth.dto.LoginRequest;
import com.sba.nutricanbe.auth.dto.RegisterRequest;
import com.sba.nutricanbe.auth.dto.RegisterResponse;
import com.sba.nutricanbe.auth.dto.SetPasswordRequest;
import com.sba.nutricanbe.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.util.UUID;

public interface AuthService {
    ApiResponse<RegisterResponse> registerCustomer(RegisterRequest request);

    ApiResponse<Void> verifyEmail(String token);

    void resendVerificationEmail(String email);

    ApiResponse<AuthResponse> login(LoginRequest request, HttpServletResponse response);

    ApiResponse<AuthResponse> refreshToken(HttpServletRequest request, HttpServletResponse response);

    ApiResponse<Void> logout(String accessToken, HttpServletRequest request, HttpServletResponse response);

    ApiResponse<AuthResponse> googleAuth(GoogleAuthRequest request);

    ApiResponse<AuthResponse> setPassword(UUID userId, SetPasswordRequest request);

    ApiResponse<AuthResponse> skipPasswordSetup(UUID userId);

    ApiResponse<AuthResponse> changePassword(UUID userId, ChangePasswordRequest request);

    void sendPasswordResetEmail(String email);

    void resetPassword(String token, String newPassword);
}
