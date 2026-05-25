package com.sba.nutrican_be.auth.service;

import com.sba.nutrican_be.auth.dto.*;
import com.sba.nutrican_be.core.dto.ApiResponse;

public interface AuthService {

    ApiResponse<AuthResponse> registerCustomer(RegisterRequest request);

    ApiResponse<AuthResponse> registerPt(RegisterPtRequest request);

    ApiResponse<AuthResponse> login(LoginRequest request);

    ApiResponse<AuthResponse> refreshToken(RefreshTokenRequest request);

    ApiResponse<Void> logout();
}
