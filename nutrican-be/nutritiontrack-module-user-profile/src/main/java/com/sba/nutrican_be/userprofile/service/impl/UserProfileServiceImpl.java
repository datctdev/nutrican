package com.sba.nutrican_be.userprofile.service.impl;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.entity.MacroTarget;
import com.sba.nutrican_be.core.entity.PtProfile;
import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.core.exception.BadRequestException;
import com.sba.nutrican_be.core.exception.ResourceNotFoundException;
import com.sba.nutrican_be.core.repository.MacroTargetRepository;
import com.sba.nutrican_be.core.repository.PtProfileRepository;
import com.sba.nutrican_be.core.repository.UserRepository;
import com.sba.nutrican_be.infrastructure.storage.StorageService;
import com.sba.nutrican_be.userprofile.dto.MacroTargetRequest;
import com.sba.nutrican_be.userprofile.dto.MacroTargetResponse;
import com.sba.nutrican_be.userprofile.dto.PtProfileSummary;
import com.sba.nutrican_be.userprofile.dto.PtRegistrationRequest;
import com.sba.nutrican_be.userprofile.dto.UpdateProfileRequest;
import com.sba.nutrican_be.userprofile.dto.UserProfileResponse;
import com.sba.nutrican_be.userprofile.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserProfileServiceImpl implements UserProfileService {

    private final UserRepository userRepository;
    private final MacroTargetRepository macroTargetRepository;
    private final PtProfileRepository ptProfileRepository;
    private final StorageService minioService;

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<UserProfileResponse> getProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        return ApiResponse.success(toProfileResponse(user));
    }

    @Override
    @Transactional
    public ApiResponse<PtProfileSummary> registerAsPt(UUID userId, PtRegistrationRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        // Check if user already has a PT profile
        if (ptProfileRepository.findByUserId(userId).isPresent()) {
            throw new BadRequestException("User already has a PT profile");
        }

        PtProfile ptProfile = PtProfile.builder()
                .user(user)
                .bio(request.getBio())
                .trainingPhilosophy(request.getTrainingPhilosophy())
                .yearsOfExperience(request.getYearsOfExperience())
                .specializations(request.getSpecializations())
                .certifications(request.getCertifications())
                .hourlyRate(request.getHourlyRate())
                .cvUrl(request.getCvUrl())
                .isVerified(false)
                .build();

        ptProfile = ptProfileRepository.save(ptProfile);
        log.info("PT profile created for user: {}", userId);

        return ApiResponse.success(toPtProfileSummary(ptProfile), "PT registration submitted successfully");
    }

    @Override
    @Transactional
    public ApiResponse<String> uploadCv(UUID userId, MultipartFile file) {
        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("application/pdf") && 
                !contentType.equals("application/msword") &&
                !contentType.contains("word") &&
                !contentType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))) {
            throw new BadRequestException("Only PDF and Word documents are allowed");
        }

        // Validate file size (max 10MB)
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new BadRequestException("File size must be less than 10MB");
        }

        try {
            String objectName = minioService.uploadFile(file, "pt-cvs");
            String presignedUrl = minioService.getPresignedUrl(objectName);

            log.info("CV uploaded for user: {}", userId);
            return ApiResponse.success(presignedUrl, "CV uploaded successfully");
        } catch (Exception e) {
            throw new BadRequestException("Failed to upload CV: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public ApiResponse<UserProfileResponse> updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber());
        if (request.getAddress() != null) user.setAddress(request.getAddress());
        if (request.getDateOfBirth() != null) {
            user.setDateOfBirth(java.time.LocalDate.parse(request.getDateOfBirth()));
        }

        user = userRepository.save(user);
        log.info("Profile updated for user: {}", userId);
        return ApiResponse.success(toProfileResponse(user), "Profile updated successfully");
    }

    @Override
    @Transactional
    public ApiResponse<String> uploadAvatar(UUID userId, MultipartFile file) {
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

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<MacroTargetResponse> getMacroTarget(UUID userId) {
        MacroTarget target = macroTargetRepository.findByUserId(userId)
                .orElse(MacroTarget.builder()
                        .user(userRepository.getReferenceById(userId))
                        .dailyCalories(BigDecimal.valueOf(2000))
                        .protein(BigDecimal.valueOf(120))
                        .carb(BigDecimal.valueOf(200))
                        .fat(BigDecimal.valueOf(65))
                        .build());
        return ApiResponse.success(toMacroResponse(target));
    }

    @Override
    @Transactional
    public ApiResponse<MacroTargetResponse> setMacroTarget(UUID userId, MacroTargetRequest request) {
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
        PtProfileSummary ptProfileSummary = null;
        var ptProfileOpt = ptProfileRepository.findByUserId(user.getId());
        if (ptProfileOpt.isPresent()) {
            ptProfileSummary = toPtProfileSummary(ptProfileOpt.get());
        }

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
                .isKycVerified(user.getIsKycVerified())
                .ptProfile(ptProfileSummary)
                .createdAt(user.getCreatedAt())
                .build();
    }

    private PtProfileSummary toPtProfileSummary(PtProfile ptProfile) {
        return PtProfileSummary.builder()
                .id(ptProfile.getId())
                .isVerified(ptProfile.getIsVerified())
                .bio(ptProfile.getBio())
                .trainingPhilosophy(ptProfile.getTrainingPhilosophy())
                .yearsOfExperience(ptProfile.getYearsOfExperience())
                .specializations(ptProfile.getSpecializations())
                .rating(ptProfile.getRating())
                .totalReviews(ptProfile.getTotalReviews())
                .tier(ptProfile.getTier() != null ? ptProfile.getTier().name() : null)
                .hourlyRate(ptProfile.getHourlyRate())
                .ptRequestStatus(ptProfile.getPtRequestStatus() != null ? ptProfile.getPtRequestStatus().name() : null)
                .verificationStatus(ptProfile.getVerificationStatus() != null ? ptProfile.getVerificationStatus().name() : null)
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
