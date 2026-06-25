package com.sba.nutricanbe.auth.service;

import com.sba.nutricanbe.auth.dto.AuthResponse;
import com.sba.nutricanbe.auth.dto.GoogleAuthRequest;
import com.sba.nutricanbe.auth.dto.LoginRequest;
import com.sba.nutricanbe.auth.dto.RegisterRequest;
import com.sba.nutricanbe.auth.dto.SetPasswordRequest;
import com.sba.nutricanbe.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.util.UUID;

public interface AuthService {
    ApiResponse<AuthResponse> registerCustomer(RegisterRequest request);
    ApiResponse<AuthResponse> login(LoginRequest request, HttpServletResponse response);
    ApiResponse<AuthResponse> refreshToken(HttpServletRequest request, HttpServletResponse response);
    ApiResponse<Void> logout(String accessToken, HttpServletRequest request, HttpServletResponse response);
    ApiResponse<AuthResponse> googleAuth(GoogleAuthRequest request);
    ApiResponse<AuthResponse> setPassword(UUID userId, SetPasswordRequest request);
    void sendPasswordResetEmail(String email);
    void resetPassword(String token, String newPassword);
}
