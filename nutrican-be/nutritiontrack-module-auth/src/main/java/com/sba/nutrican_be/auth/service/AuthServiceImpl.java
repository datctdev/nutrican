package com.sba.nutrican_be.auth.service;

import com.sba.nutrican_be.auth.dto.AuthResponse;
import com.sba.nutrican_be.auth.dto.LoginRequest;
import com.sba.nutrican_be.auth.dto.RegisterRequest;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.core.enums.UserRole;
import com.sba.nutrican_be.core.enums.UserStatus;
import com.sba.nutrican_be.core.exception.BadRequestException;
import com.sba.nutrican_be.core.exception.UnauthorizedException;
import com.sba.nutrican_be.core.repository.UserRepository;
import com.sba.nutrican_be.core.util.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final Logger auditLog = LoggerFactory.getLogger("SECURITY_AUDIT");

    private static final String REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
    private static final String COOKIE_PATH = "/";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    final JwtUtil jwtUtil;
    private final TokenRevocationService tokenRevocationService;

    @Value("${app.security.jwt.expiration}")
    private Long jwtExpirationMs;

    @Override
    @Transactional
    public ApiResponse<AuthResponse> registerCustomer(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phoneNumber(request.getPhoneNumber())
                .role(UserRole.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build();

        user = userRepository.save(user);
        log.info("User registered: {}", user.getEmail());

        return ApiResponse.success(buildAuthResponse(user, null, null), "Registration successful");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<AuthResponse> login(LoginRequest request, HttpServletResponse response) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    auditLog.warn("AUTH_FAILED: email={}, reason=USER_NOT_FOUND", request.getEmail());
                    return new UnauthorizedException("Invalid email or password");
                });

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            auditLog.warn("AUTH_FAILED: email={}, userId={}, reason=INVALID_PASSWORD",
                    request.getEmail(), user.getId());
            throw new UnauthorizedException("Invalid email or password");
        }

        if (user.getStatus() == UserStatus.SUSPENDED) {
            auditLog.warn("AUTH_FAILED: email={}, userId={}, reason=ACCOUNT_SUSPENDED",
                    request.getEmail(), user.getId());
            throw new BadRequestException("Account is suspended");
        }

        if (user.getStatus() == UserStatus.PENDING_APPROVAL
                || user.getStatus() == UserStatus.PENDING_VERIFICATION) {
            auditLog.warn("AUTH_FAILED: email={}, userId={}, reason=ACCOUNT_PENDING",
                    request.getEmail(), user.getId());
            throw new BadRequestException("Account is pending approval");
        }

        auditLog.info("AUTH_SUCCESS: email={}, userId={}, role={}",
                user.getEmail(), user.getId(), user.getRole());
        return ApiResponse.success(buildAuthResponse(user, null, response), "Login successful");
    }

    @Override
    @Transactional
    public ApiResponse<AuthResponse> refreshToken(HttpServletRequest request, HttpServletResponse response) {
        String rawRefreshToken = extractRefreshTokenFromCookie(request);
        if (!StringUtils.hasText(rawRefreshToken)) {
            throw new UnauthorizedException("Refresh token missing");
        }

        if (!jwtUtil.validateToken(rawRefreshToken)) {
            throw new UnauthorizedException("Invalid refresh token");
        }

        if (!jwtUtil.isRefreshToken(rawRefreshToken)) {
            throw new UnauthorizedException("Invalid token type");
        }

        if (tokenRevocationService.isRevoked(rawRefreshToken)) {
            throw new UnauthorizedException("Token has been revoked");
        }

        tokenRevocationService.revoke(rawRefreshToken);

        UUID userId = jwtUtil.getUserIdFromRefreshToken(rawRefreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    auditLog.warn("TOKEN_REFRESH_FAILED: reason=USER_NOT_FOUND, tokenId={}",
                            jwtUtil.getTokenId(rawRefreshToken));
                    return new UnauthorizedException("User not found");
                });

        auditLog.info("TOKEN_REFRESHED: userId={}", user.getId());
        return ApiResponse.success(buildAuthResponse(user, rawRefreshToken, response), "Token refreshed");
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE_NAME, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath(COOKIE_PATH);
        cookie.setMaxAge(0);
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);
    }

    @Override
    @Transactional
    public ApiResponse<Void> logout(String accessToken, HttpServletRequest request, HttpServletResponse response) {
        boolean revoked = StringUtils.hasText(accessToken)
                && tokenRevocationService.revoke(accessToken);

        String rawRefreshToken = extractRefreshTokenFromCookie(request);
        boolean refreshRevoked = StringUtils.hasText(rawRefreshToken)
                && tokenRevocationService.revoke(rawRefreshToken);

        clearRefreshTokenCookie(response);

        if (!revoked && !refreshRevoked) {
            log.warn("Logout called but no tokens were found to revoke for this session");
        } else {
            log.info("User logged out, tokens revoked: accessToken={}, refreshToken={}",
                    revoked, refreshRevoked);
        }
        return ApiResponse.success(null, "Logout successful");
    }

    private AuthResponse buildAuthResponse(User user, String oldRefreshToken, HttpServletResponse response) {
        String accessToken = jwtUtil.generateToken(user.getEmail(), user.getId(), user.getRole().name());
        String newRefreshToken = jwtUtil.generateRefreshToken(user.getEmail(), user.getId());

        if (response != null) {
            setRefreshTokenCookie(response, newRefreshToken);
        }

        if (StringUtils.hasText(oldRefreshToken)) {
            tokenRevocationService.revoke(oldRefreshToken);
        }

        AuthResponse.UserInfo userInfo = AuthResponse.UserInfo.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .avatarUrl(user.getAvatarUrl())
                .isKycVerified(user.getIsKycVerified())
                .build();

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(null)
                .tokenType("Bearer")
                .expiresIn(jwtExpirationMs / 1000)
                .user(userInfo)
                .build();
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath(COOKIE_PATH);
        cookie.setMaxAge((int) (jwtExpirationMs * 7 / 1000));
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);
    }

    private String extractRefreshTokenFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (REFRESH_TOKEN_COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
