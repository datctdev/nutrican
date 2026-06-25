package com.sba.nutricanbe.auth.service.impl;

import com.sba.nutricanbe.auth.dto.AuthResponse;
import com.sba.nutricanbe.auth.dto.GoogleAuthRequest;
import com.sba.nutricanbe.auth.dto.LoginRequest;
import com.sba.nutricanbe.auth.dto.RegisterRequest;
import com.sba.nutricanbe.auth.dto.SetPasswordRequest;
import com.sba.nutricanbe.auth.service.AuthService;
import com.sba.nutricanbe.auth.service.GoogleIdTokenService;
import com.sba.nutricanbe.auth.service.TokenRevocationService;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.auth.entity.PasswordResetToken;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.exception.TooManyRequestsException;
import com.sba.nutricanbe.common.exception.UnauthorizedException;
import com.sba.nutricanbe.auth.repository.PasswordResetTokenRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.infrastructure.mail.MailService;
import com.sba.nutricanbe.common.util.JwtUtil;
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

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.time.Duration;
import com.sba.nutricanbe.infrastructure.service.RateLimitingService;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final Logger auditLog = LoggerFactory.getLogger("SECURITY_AUDIT");
    private final RateLimitingService rateLimitingService;

    private static final String REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
    private static final String COOKIE_PATH = "/";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    final JwtUtil jwtUtil;
    private final TokenRevocationService tokenRevocationService;
    private final com.sba.nutricanbe.auth.service.GoogleIdTokenService googleIdTokenService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final MailService emailService;

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
                .passwordSetRequired(false)
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

        if (user.getPasswordSetRequired() != null && user.getPasswordSetRequired()) {
            auditLog.warn("AUTH_FAILED: email={}, userId={}, reason=PASSWORD_NOT_SET",
                    request.getEmail(), user.getId());
            throw new BadRequestException("Please set a password before logging in. Use 'Login with Google' to complete account setup.");
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

    @Override
    @Transactional
    public ApiResponse<AuthResponse> googleAuth(GoogleAuthRequest request) {
        GoogleIdTokenService.GoogleTokenPayload payload = googleIdTokenService.verify(request.googleIdToken());

        String email = payload.email();
        String googleId = payload.googleId();
        String name = payload.name();
        String picture = payload.picture();

        Optional<User> byGoogleId = userRepository.findByGoogleId(googleId);

        User user;
        if (byGoogleId.isPresent()) {
            user = byGoogleId.get();
        } else {
            Optional<User> byEmail = userRepository.findByEmail(email);
            if (byEmail.isPresent()) {
                User existing = byEmail.get();
                existing.setGoogleId(googleId);
                existing.setGooglePictureUrl(picture);
                existing.setPasswordSetRequired(true);
                existing.setStatus(UserStatus.PENDING_PASSWORD);
                user = userRepository.save(existing);
            } else {
                user = userRepository.save(User.createGoogleUser(email, googleId, name, picture));
            }
        }

        auditLog.info("GOOGLE_AUTH: email={}, userId={}, passwordRequired={}",
                user.getEmail(), user.getId(), user.getPasswordSetRequired());

        if (user.getPasswordSetRequired() != null && user.getPasswordSetRequired()) {
            String limitedToken = jwtUtil.generateLimitedToken(user.getEmail(), user.getId(), user.getRole().name());
            AuthResponse.UserInfo userInfo = buildUserInfo(user);
            return ApiResponse.success(AuthResponse.builder()
                    .accessToken(limitedToken)
                    .tokenType("Bearer")
                    .expiresIn(jwtExpirationMs / 1000)
                    .user(userInfo)
                    .requiresPasswordSetup(true)
                    .build(), "Google authentication successful");
        }

        return ApiResponse.success(buildAuthResponse(user, null, null), "Google authentication successful");
    }

    @Override
    @Transactional
    public ApiResponse<AuthResponse> setPassword(UUID userId, SetPasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    auditLog.warn("SET_PASSWORD_FAILED: userId={}, reason=USER_NOT_FOUND", userId);
                    return new UnauthorizedException("User not found");
                });

        if (user.getPasswordSetRequired() == null || !user.getPasswordSetRequired()) {
            auditLog.warn("SET_PASSWORD_FAILED: userId={}, reason=PASSWORD_ALREADY_SET", userId);
            throw new BadRequestException("Password has already been set for this account");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setPasswordSetRequired(false);
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);

        auditLog.info("PASSWORD_SET: userId={}, email={}", userId, user.getEmail());
        return ApiResponse.success(buildAuthResponse(user, null, null), "Password set successfully");
    }

    @Override
    @Transactional
    public void sendPasswordResetEmail(String email) {
        if (!rateLimitingService.tryConsume("rl:pwd:" + email, 1, Duration.ofSeconds(60))) {
            throw new TooManyRequestsException("Please wait before requesting another reset email");
        }

        userRepository.findByEmail(email).ifPresent(user -> {
            passwordResetTokenRepository.deleteByUserId(user.getId());

            String token = UUID.randomUUID().toString();
            Instant expiresAt = Instant.now().plusSeconds(15 * 60);

            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .userId(user.getId())
                    .token(token)
                    .expiresAt(expiresAt)
                    .used(false)
                    .build();
            passwordResetTokenRepository.save(resetToken);

            emailService.sendPasswordResetEmail(user.getEmail(), token);
            auditLog.info("PASSWORD_RESET_INITIATED: email={}, userId={}", email, user.getId());
        });
    }

    @Override
    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token)
                .orElseThrow(() -> {
                    auditLog.warn("PASSWORD_RESET_FAILED: reason=TOKEN_NOT_FOUND");
                    return new BadRequestException("Invalid or expired reset token");
                });

        if (resetToken.getUsed()) {
            auditLog.warn("PASSWORD_RESET_FAILED: reason=TOKEN_ALREADY_USED");
            throw new BadRequestException("This reset link has already been used");
        }

        if (resetToken.isExpired()) {
            auditLog.warn("PASSWORD_RESET_FAILED: reason=TOKEN_EXPIRED");
            throw new BadRequestException("This reset link has expired");
        }

        User user = userRepository.findById(resetToken.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", resetToken.getUserId()));
        user.setPasswordHash(passwordEncoder.encode(newPassword));

        if (user.getStatus() == UserStatus.PENDING_PASSWORD) {
            user.setStatus(UserStatus.ACTIVE);
            user.setPasswordSetRequired(false);
        }

        userRepository.save(user);
        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        auditLog.info("PASSWORD_RESET_COMPLETED: userId={}, email={}", user.getId(), user.getEmail());
    }

    private AuthResponse.UserInfo buildUserInfo(User user) {
        return AuthResponse.UserInfo.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .avatarUrl(user.getAvatarUrl())
                .isKycVerified(user.getIsKycVerified())
                .build();
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
                .requiresPasswordSetup(false)
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

