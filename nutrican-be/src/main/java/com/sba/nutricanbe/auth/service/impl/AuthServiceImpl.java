package com.sba.nutricanbe.auth.service.impl;

import com.sba.nutricanbe.auth.dto.AuthResponse;
import com.sba.nutricanbe.auth.dto.ChangePasswordRequest;
import com.sba.nutricanbe.auth.dto.GoogleAuthRequest;
import com.sba.nutricanbe.auth.dto.LoginRequest;
import com.sba.nutricanbe.auth.dto.RegisterRequest;
import com.sba.nutricanbe.auth.dto.RegisterResponse;
import com.sba.nutricanbe.auth.dto.SetPasswordRequest;
import com.sba.nutricanbe.auth.service.AuthService;
import com.sba.nutricanbe.auth.service.GoogleIdTokenService;
import com.sba.nutricanbe.auth.service.TokenRevocationService;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.auth.entity.EmailVerificationToken;
import com.sba.nutricanbe.auth.entity.PasswordResetToken;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.exception.TooManyRequestsException;
import com.sba.nutricanbe.common.exception.UnauthorizedException;
import com.sba.nutricanbe.auth.repository.EmailVerificationTokenRepository;
import com.sba.nutricanbe.auth.repository.PasswordResetTokenRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.UserAccountStatusHelper;
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
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final MailService emailService;
    private final UserAccountStatusHelper userAccountStatusHelper;

    @Value("${app.security.jwt.expiration}")
    private Long jwtExpirationMs;

    @Value("${app.auth.email-verification-expiry-hours:24}")
    private int emailVerificationExpiryHours;

    @Override
    @Transactional
    public ApiResponse<RegisterResponse> registerCustomer(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phoneNumber(request.getPhoneNumber())
                .role(UserRole.CUSTOMER)
                .status(UserStatus.PENDING_VERIFICATION)
                .passwordSetRequired(false)
                .onboardingStep(1)
                .build();

        user = userRepository.save(user);
        issueEmailVerificationToken(user);
        log.info("User registered (pending email verification): {}", user.getEmail());

        return ApiResponse.success(
                RegisterResponse.builder().email(user.getEmail()).build(),
                "Registration successful. Please check your email to verify your account.");
    }

    @Override
    @Transactional
    public ApiResponse<Void> verifyEmail(String token) {
        if (token == null || token.isBlank()) {
            throw new BadRequestException("Verification token is required");
        }

        EmailVerificationToken verificationToken = emailVerificationTokenRepository.findByToken(token.trim())
                .orElseThrow(() -> {
                    auditLog.warn("EMAIL_VERIFY_FAILED: reason=TOKEN_NOT_FOUND");
                    return new BadRequestException("Invalid or expired verification link");
                });

        if (Boolean.TRUE.equals(verificationToken.getUsed())) {
            auditLog.warn("EMAIL_VERIFY_FAILED: reason=TOKEN_ALREADY_USED");
            throw new BadRequestException("This verification link has already been used");
        }

        if (verificationToken.isExpired()) {
            auditLog.warn("EMAIL_VERIFY_FAILED: reason=TOKEN_EXPIRED");
            throw new BadRequestException("This verification link has expired");
        }

        User user = userRepository.findById(verificationToken.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", verificationToken.getUserId()));

        if (user.getStatus() == UserStatus.ACTIVE) {
            verificationToken.setUsed(true);
            emailVerificationTokenRepository.save(verificationToken);
            return ApiResponse.success(null, "Email already verified. You can log in.");
        }

        if (user.getStatus() != UserStatus.PENDING_VERIFICATION) {
            throw new BadRequestException("Account cannot be verified in status " + user.getStatus());
        }

        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);

        verificationToken.setUsed(true);
        emailVerificationTokenRepository.save(verificationToken);

        auditLog.info("EMAIL_VERIFIED: userId={}, email={}", user.getId(), user.getEmail());
        return ApiResponse.success(null, "Email verified successfully. You can now log in.");
    }

    @Override
    @Transactional
    public void resendVerificationEmail(String email) {
        if (!rateLimitingService.tryConsume("rl:verify:" + email, 1, Duration.ofSeconds(60))) {
            throw new TooManyRequestsException("Please wait before requesting another verification email");
        }

        userRepository.findByEmail(email).ifPresent(user -> {
            if (user.getStatus() != UserStatus.PENDING_VERIFICATION) {
                return;
            }
            issueEmailVerificationToken(user);
            auditLog.info("EMAIL_VERIFY_RESENT: email={}, userId={}", email, user.getId());
        });
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

        if (user.getStatus() == UserStatus.SUSPENDED
                || user.getSuspendedUntil() != null) {
            userAccountStatusHelper.assertNotSuspendedOrThrow(user);
        }

        if (user.getPasswordSetRequired() != null && user.getPasswordSetRequired()) {
            auditLog.warn("AUTH_FAILED: email={}, userId={}, reason=PASSWORD_NOT_SET",
                    request.getEmail(), user.getId());
            throw new BadRequestException("Please set a password before logging in. Use 'Login with Google' to complete account setup.");
        }

        if (user.getStatus() == UserStatus.PENDING_VERIFICATION) {
            auditLog.warn("AUTH_FAILED: email={}, userId={}, reason=EMAIL_NOT_VERIFIED",
                    request.getEmail(), user.getId());
            throw new BadRequestException("Please verify your email before logging in");
        }

        if (user.getStatus() == UserStatus.PENDING_APPROVAL) {
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

        userAccountStatusHelper.assertNotSuspendedOrThrow(user);

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

        if (!payload.emailVerified()) {
            auditLog.warn("GOOGLE_AUTH_FAILED: reason=EMAIL_NOT_VERIFIED, email={}", payload.email());
            throw new BadRequestException("Google email is not verified");
        }

        String email = payload.email();
        String googleId = payload.googleId();
        String name = payload.name();
        String picture = payload.picture();

        Optional<User> byGoogleId = userRepository.findByGoogleId(googleId);

        User user;
        if (byGoogleId.isPresent()) {
            user = byGoogleId.get();
            userAccountStatusHelper.assertNotSuspendedOrThrow(user);
            if (user.getStatus() == UserStatus.PENDING_PASSWORD) {
                user.setStatus(UserStatus.ACTIVE);
                user.setPasswordSetRequired(false);
                user = userRepository.save(user);
            }
        } else {
            Optional<User> byEmail = userRepository.findByEmail(email);
            if (byEmail.isPresent()) {
                User existing = byEmail.get();
                userAccountStatusHelper.assertNotSuspendedOrThrow(existing);
                if (existing.getStatus() == UserStatus.PENDING_VERIFICATION) {
                    auditLog.warn("GOOGLE_AUTH_FAILED: reason=LOCAL_EMAIL_UNVERIFIED, email={}, userId={}",
                            email, existing.getId());
                    throw new BadRequestException(
                            "Please verify your email before linking Google sign-in");
                }
                if (StringUtils.hasText(existing.getGoogleId())
                        && !existing.getGoogleId().equals(googleId)) {
                    auditLog.warn("GOOGLE_AUTH_FAILED: reason=GOOGLE_ID_CONFLICT, email={}, userId={}",
                            email, existing.getId());
                    throw new BadRequestException(
                            "This account is already linked to a different Google identity");
                }
                existing.setGoogleId(googleId);
                existing.setGooglePictureUrl(picture);
                if (!StringUtils.hasText(existing.getPasswordHash())
                        && existing.getStatus() == UserStatus.PENDING_PASSWORD) {
                    existing.setStatus(UserStatus.ACTIVE);
                    existing.setPasswordSetRequired(false);
                }
                user = userRepository.save(existing);
                auditLog.info("GOOGLE_LINK: email={}, userId={}, hasPassword={}",
                        email, user.getId(), StringUtils.hasText(user.getPasswordHash()));
            } else {
                user = userRepository.save(User.createGoogleUser(email, googleId, name, picture));
                auditLog.info("GOOGLE_AUTH: email={}, userId={}, newGoogleUser=true",
                        email, user.getId());
            }
        }

        boolean suggestPassword = !StringUtils.hasText(user.getPasswordHash());
        auditLog.info("GOOGLE_AUTH: email={}, userId={}, suggestPasswordSetup={}",
                user.getEmail(), user.getId(), suggestPassword);

        AuthResponse response = buildAuthResponse(user, null, null);
        response.setRequiresPasswordSetup(suggestPassword);
        response.setSuggestPasswordSetup(suggestPassword);
        return ApiResponse.success(response, "Google authentication successful");
    }

    @Override
    @Transactional
    public ApiResponse<AuthResponse> setPassword(UUID userId, SetPasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    auditLog.warn("SET_PASSWORD_FAILED: userId={}, reason=USER_NOT_FOUND", userId);
                    return new UnauthorizedException("User not found");
                });

        if (StringUtils.hasText(user.getPasswordHash())) {
            auditLog.warn("SET_PASSWORD_FAILED: userId={}, reason=PASSWORD_ALREADY_SET", userId);
            throw new BadRequestException("Password has already been set for this account");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setPasswordSetRequired(false);
        if (user.getStatus() == UserStatus.PENDING_PASSWORD) {
            user.setStatus(UserStatus.ACTIVE);
        }
        userRepository.save(user);

        auditLog.info("PASSWORD_SET: userId={}, email={}", userId, user.getEmail());
        return ApiResponse.success(buildAuthResponse(user, null, null), "Password set successfully");
    }

    @Override
    @Transactional
    public ApiResponse<AuthResponse> skipPasswordSetup(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    auditLog.warn("SKIP_PASSWORD_FAILED: userId={}, reason=USER_NOT_FOUND", userId);
                    return new UnauthorizedException("User not found");
                });

        if (StringUtils.hasText(user.getPasswordHash())) {
            auditLog.warn("SKIP_PASSWORD_FAILED: userId={}, reason=PASSWORD_ALREADY_SET", userId);
            throw new BadRequestException("Password is already set for this account");
        }

        user.setPasswordSetRequired(false);
        if (user.getStatus() == UserStatus.PENDING_PASSWORD) {
            user.setStatus(UserStatus.ACTIVE);
        }
        userRepository.save(user);

        auditLog.info("GOOGLE_SKIP_PASSWORD: userId={}, email={}", userId, user.getEmail());
        AuthResponse response = buildAuthResponse(user, null, null);
        response.setRequiresPasswordSetup(false);
        response.setSuggestPasswordSetup(false);
        return ApiResponse.success(response, "Password setup skipped");
    }

    @Override
    @Transactional
    public ApiResponse<AuthResponse> changePassword(UUID userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    auditLog.warn("CHANGE_PASSWORD_FAILED: userId={}, reason=USER_NOT_FOUND", userId);
                    return new UnauthorizedException("User not found");
                });

        if (!StringUtils.hasText(user.getPasswordHash())) {
            auditLog.warn("CHANGE_PASSWORD_FAILED: userId={}, reason=NO_PASSWORD_HASH", userId);
            throw new BadRequestException(
                    "No password is set for this account. Use set-password or sign in with Google first.");
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            auditLog.warn("CHANGE_PASSWORD_FAILED: userId={}, reason=INVALID_CURRENT_PASSWORD", userId);
            throw new BadRequestException("Current password is incorrect");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            auditLog.warn("CHANGE_PASSWORD_FAILED: userId={}, reason=SAME_AS_CURRENT", userId);
            throw new BadRequestException("New password must be different from the current password");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        if (Boolean.TRUE.equals(user.getPasswordSetRequired())) {
            user.setPasswordSetRequired(false);
            if (user.getStatus() == UserStatus.PENDING_PASSWORD) {
                user.setStatus(UserStatus.ACTIVE);
            }
        }
        userRepository.save(user);

        auditLog.info("CHANGE_PASSWORD: userId={}, email={}", userId, user.getEmail());
        return ApiResponse.success(buildAuthResponse(user, null, null), "Password changed successfully");
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

    private void issueEmailVerificationToken(User user) {
        emailVerificationTokenRepository.deleteByUserId(user.getId());

        String token = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plusSeconds(emailVerificationExpiryHours * 3600L);

        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .userId(user.getId())
                .token(token)
                .expiresAt(expiresAt)
                .used(false)
                .build();
        emailVerificationTokenRepository.save(verificationToken);

        emailService.sendEmailVerificationEmail(user.getEmail(), token, emailVerificationExpiryHours);
    }

    private AuthResponse.UserInfo buildUserInfo(User user) {
        boolean hasPassword = StringUtils.hasText(user.getPasswordHash());
        return AuthResponse.UserInfo.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .avatarUrl(user.getAvatarUrl())
                .isKycVerified(user.getIsKycVerified())
                .passwordSetRequired(Boolean.TRUE.equals(user.getPasswordSetRequired()))
                .hasPassword(hasPassword)
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

        AuthResponse.UserInfo userInfo = buildUserInfo(user);
        boolean suggestPassword = !Boolean.TRUE.equals(userInfo.getHasPassword());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(null)
                .tokenType("Bearer")
                .expiresIn(jwtExpirationMs / 1000)
                .user(userInfo)
                .requiresPasswordSetup(suggestPassword)
                .suggestPasswordSetup(suggestPassword)
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

