package com.sba.nutrican_be.auth.service;

import com.sba.nutrican_be.auth.dto.*;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.entity.PtProfile;
import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.core.enums.UserRole;
import com.sba.nutrican_be.core.enums.UserStatus;
import com.sba.nutrican_be.core.exception.BadRequestException;
import com.sba.nutrican_be.core.exception.UnauthorizedException;
import com.sba.nutrican_be.core.repository.PtProfileRepository;
import com.sba.nutrican_be.core.repository.UserRepository;
import com.sba.nutrican_be.core.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PtProfileRepository ptProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

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
        log.info("Customer registered: {}", user.getEmail());

        return ApiResponse.success(buildAuthResponse(user), "Registration successful");
    }

    @Override
    @Transactional
    public ApiResponse<AuthResponse> registerPt(RegisterPtRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phoneNumber(request.getPhoneNumber())
                .role(UserRole.PT_FREELANCE)
                .status(UserStatus.PENDING_APPROVAL)
                .build();

        user = userRepository.save(user);

        PtProfile profile = PtProfile.builder()
                .user(user)
                .bio(request.getBio())
                .trainingPhilosophy(request.getTrainingPhilosophy())
                .yearsOfExperience(request.getYearsOfExperience())
                .certifications(request.getCertifications())
                .verificationStatus(UserStatus.PENDING_APPROVAL)
                .isVerified(false)
                .build();

        ptProfileRepository.save(profile);
        log.info("PT registered: {} (pending approval)", user.getEmail());

        return ApiResponse.success(buildAuthResponse(user), "PT registration submitted for approval");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<AuthResponse> login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw new BadRequestException("Account is suspended");
        }

        if (user.getStatus() == UserStatus.PENDING_APPROVAL
                && (user.getRole() == UserRole.PT_CERTIFIED || user.getRole() == UserRole.PT_FREELANCE)) {
            throw new BadRequestException("PT account is pending admin approval");
        }

        return ApiResponse.success(buildAuthResponse(user), "Login successful");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<AuthResponse> refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();

        if (!jwtUtil.validateToken(refreshToken)) {
            throw new UnauthorizedException("Invalid refresh token");
        }

        if (!jwtUtil.isRefreshToken(refreshToken)) {
            throw new UnauthorizedException("Invalid token type");
        }

        String email = jwtUtil.getEmailFromToken(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        return ApiResponse.success(buildAuthResponse(user), "Token refreshed");
    }

    @Override
    public ApiResponse<Void> logout() {
        return ApiResponse.success(null, "Logout successful");
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtUtil.generateToken(user.getEmail(), user.getId(), user.getRole().name());
        String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());

        AuthResponse.UserInfo userInfo = AuthResponse.UserInfo.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .avatarUrl(user.getAvatarUrl())
                .build();

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtExpirationMs / 1000)
                .user(userInfo)
                .build();
    }
}
