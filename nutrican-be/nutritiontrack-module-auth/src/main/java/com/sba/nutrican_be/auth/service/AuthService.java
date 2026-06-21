package com.sba.nutrican_be.auth.service;

import com.sba.nutrican_be.auth.dto.AuthResponse;
import com.sba.nutrican_be.auth.dto.GoogleAuthRequest;
import com.sba.nutrican_be.auth.dto.LoginRequest;
import com.sba.nutrican_be.auth.dto.RegisterRequest;
import com.sba.nutrican_be.auth.dto.SetPasswordRequest;
import com.sba.nutrican_be.core.dto.ApiResponse;
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
}
