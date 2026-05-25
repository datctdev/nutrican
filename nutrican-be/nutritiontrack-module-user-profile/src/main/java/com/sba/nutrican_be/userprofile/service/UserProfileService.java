package com.sba.nutrican_be.userprofile.service;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.entity.MacroTarget;
import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.core.exception.BadRequestException;
import com.sba.nutrican_be.core.exception.ResourceNotFoundException;
import com.sba.nutrican_be.core.repository.MacroTargetRepository;
import com.sba.nutrican_be.core.repository.UserRepository;
import com.sba.nutrican_be.core.service.MinioService;
import com.sba.nutrican_be.userprofile.dto.MacroTargetRequest;
import com.sba.nutrican_be.userprofile.dto.MacroTargetResponse;
import com.sba.nutrican_be.userprofile.dto.UpdateProfileRequest;
import com.sba.nutrican_be.userprofile.dto.UserProfileResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserRepository userRepository;
    private final MacroTargetRepository macroTargetRepository;
    private final MinioService minioService;

    @Transactional(readOnly = true)
    public ApiResponse<UserProfileResponse> getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        return ApiResponse.success(toProfileResponse(user));
    }

    @Transactional
    public ApiResponse<UserProfileResponse> updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber());
        if (request.getAddress() != null) user.setAddress(request.getAddress());
        if (request.getDateOfBirth() != null) user.setDateOfBirth(
                java.time.LocalDateTime.parse(request.getDateOfBirth()));

        user = userRepository.save(user);
        log.info("Profile updated for user: {}", userId);
        return ApiResponse.success(toProfileResponse(user), "Profile updated successfully");
    }

    @Transactional
    public ApiResponse<String> uploadAvatar(Long userId, MultipartFile file) {
        try {
            String objectName = minioService.uploadFile(file, "avatars");
            String presignedUrl = minioService.getPresignedUrl(objectName);

            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", userId));

            if (user.getAvatarUrl() != null) {
                String oldObjectName = extractObjectName(user.getAvatarUrl());
                if (oldObjectName != null) minioService.deleteFile(oldObjectName);
            }

            user.setAvatarUrl(presignedUrl);
            userRepository.save(user);

            log.info("Avatar uploaded for user: {}", userId);
            return ApiResponse.success(presignedUrl, "Avatar uploaded successfully");
        } catch (Exception e) {
            throw new BadRequestException("Failed to upload avatar: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public ApiResponse<MacroTargetResponse> getMacroTarget(Long userId) {
        MacroTarget target = macroTargetRepository.findByUserId(userId)
                .orElse(MacroTarget.builder()
                        .user(userRepository.getReferenceById(userId))
                        .dailyCalories(java.math.BigDecimal.valueOf(2000))
                        .protein(java.math.BigDecimal.valueOf(120))
                        .carb(java.math.BigDecimal.valueOf(200))
                        .fat(java.math.BigDecimal.valueOf(65))
                        .build());
        return ApiResponse.success(toMacroResponse(target));
    }

    @Transactional
    public ApiResponse<MacroTargetResponse> setMacroTarget(Long userId, MacroTargetRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        MacroTarget target = macroTargetRepository.findByUserId(userId)
                .orElse(MacroTarget.builder().user(user).build());

        if (request.getDailyCalories() != null) target.setDailyCalories(request.getDailyCalories());
        if (request.getProtein() != null) target.setProtein(request.getProtein());
        if (request.getCarb() != null) target.setCarb(request.getCarb());
        if (request.getFat() != null) target.setFat(request.getFat());

        target = macroTargetRepository.save(target);
        log.info("Macro target updated for user: {}", userId);
        return ApiResponse.success(toMacroResponse(target), "Macro target updated");
    }

    private UserProfileResponse toProfileResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .address(user.getAddress())
                .dateOfBirth(user.getDateOfBirth() != null ? user.getDateOfBirth().toString() : null)
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole().name())
                .status(user.getStatus().name())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private MacroTargetResponse toMacroResponse(MacroTarget target) {
        return MacroTargetResponse.builder()
                .id(target.getId())
                .dailyCalories(target.getDailyCalories())
                .protein(target.getProtein())
                .carb(target.getCarb())
                .fat(target.getFat())
                .build();
    }

    private String extractObjectName(String url) {
        if (url == null) return null;
        String[] parts = url.split("/");
        if (parts.length > 0) {
            return parts[parts.length - 1].split("\\?")[0];
        }
        return null;
    }
}
