package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.user.dto.CertificationData;
import com.sba.nutricanbe.user.entity.MacroTarget;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.user.repository.MacroTargetRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.infrastructure.storage.StorageService;
import com.sba.nutricanbe.user.dto.MacroTargetRequest;
import com.sba.nutricanbe.user.dto.MacroTargetResponse;
import com.sba.nutricanbe.user.dto.PtProfileSummary;
import com.sba.nutricanbe.user.dto.PtRegistrationRequest;
import com.sba.nutricanbe.user.dto.UpdateProfileRequest;
import com.sba.nutricanbe.user.dto.UpdatePtProfileRequest;
import com.sba.nutricanbe.user.dto.UserProfileResponse;
import com.sba.nutricanbe.user.service.UserProfileService;
import com.sba.nutricanbe.common.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserProfileServiceImpl implements UserProfileService {

    private final UserRepository userRepository;
    private final MacroTargetRepository macroTargetRepository;
    private final PtProfileRepository ptProfileRepository;
    private final StorageService minioService;
    private final SystemSettingRepository systemSettingRepository;

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

        // Check REQUIRE_KYC_FOR_PT setting
        boolean requireKyc = systemSettingRepository.findById("REQUIRE_KYC_FOR_PT")
                .map(setting -> Boolean.parseBoolean(setting.getValue()))
                .orElse(true);

        if (requireKyc && (user.getIsKycVerified() == null || !user.getIsKycVerified())) {
            throw new BadRequestException("Bạn phải xác thực danh tính (KYC) trước khi đăng ký làm PT");
        }

        // Check if user already has a PT profile
        if (ptProfileRepository.findByUserId(userId).isPresent()) {
            throw new BadRequestException("User already has a PT profile");
        }

        // Map certifications from request DTOs to entity data objects
        List<CertificationData> certDataList = mapCerts(request);

        if ("CERTIFIED".equalsIgnoreCase(request.getPreferredTrack())) {
            if (certDataList == null || certDataList.isEmpty()) {
                throw new BadRequestException("PT Chuyên nghiệp (Certified) yêu cầu tối thiểu 1 chứng chỉ");
            }
        }

        // Intentional: User.role stays CUSTOMER until admin approves (PtAdminServiceImpl).
        // PT pending state lives on PtProfile.ptRequestStatus (default PENDING_APPROVAL).
        // Customer can still use /diet while PT application is pending — by design.

        PtProfile ptProfile = PtProfile.builder()
                .user(user)
                .preferredTrack(request.getPreferredTrack())
                .bio(request.getBio())
                .trainingPhilosophy(request.getTrainingPhilosophy())
                .experienceStartDate(request.getExperienceStartDate())
                .contactPhone(request.getContactPhone())
                .trainingMode(request.getTrainingMode())
                .location(request.getLocation())
                .rateUnit(request.getRateUnit())
                .specializations(request.getSpecializations())
                .certifications(certDataList)
                .hourlyRate(request.getHourlyRate())
                .gender(request.getGender())
                .cvUrl(request.getCvUrl())
                .instagramUrl(request.getInstagramUrl())
                .linkedinUrl(request.getLinkedinUrl())
                .isVerified(false)
                .build();

        ptProfile = ptProfileRepository.save(ptProfile);
        log.info("PT profile created for user: {}", userId);

        return ApiResponse.success(toPtProfileSummary(ptProfile), "PT registration submitted successfully");
    }

    @Override
    @Transactional
    public ApiResponse<PtProfileSummary> resubmitPt(UUID userId, PtRegistrationRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        PtProfile profile = ptProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new BadRequestException("No PT profile to resubmit"));
        if (profile.getPtRequestStatus() != UserStatus.SUSPENDED) {
            throw new BadRequestException("Only rejected profiles can be resubmitted");
        }
        boolean requireKyc = systemSettingRepository.findById("REQUIRE_KYC_FOR_PT")
                .map(s -> Boolean.parseBoolean(s.getValue())).orElse(true);
        if (requireKyc && !Boolean.TRUE.equals(user.getIsKycVerified())) {
            throw new BadRequestException("KYC required before resubmit");
        }
        List<CertificationData> certDataList = mapCerts(request);
        if ("CERTIFIED".equalsIgnoreCase(request.getPreferredTrack())
                && (certDataList == null || certDataList.isEmpty())) {
            throw new BadRequestException("CERTIFIED requires at least one certificate");
        }
        applyPtFields(profile, request, certDataList);
        profile.setPtRequestStatus(UserStatus.PENDING_APPROVAL);
        profile.setVerificationStatus(UserStatus.PENDING_APPROVAL);
        profile.setAdminRejectNote(null);
        profile = ptProfileRepository.save(profile);
        return ApiResponse.success(toPtProfileSummary(profile), "PT profile resubmitted");
    }

    private List<CertificationData> mapCerts(PtRegistrationRequest request) {
        if (request.getCertifications() == null || request.getCertifications().isEmpty()) {
            return null;
        }
        return request.getCertifications().stream()
                .map(c -> CertificationData.builder()
                        .name(c.getName())
                        .issuingOrganization(c.getIssuingOrganization())
                        .issueDate(c.getIssueDate())
                        .expiryDate(c.getExpiryDate())
                        .neverExpires(Boolean.TRUE.equals(c.getNeverExpires()))
                        .certificateImageUrl(c.getCertificateImageUrl())
                        .build())
                .toList();
    }

    private void applyPtFields(PtProfile profile, PtRegistrationRequest request, List<CertificationData> certs) {
        profile.setPreferredTrack(request.getPreferredTrack());
        profile.setBio(request.getBio());
        profile.setTrainingPhilosophy(request.getTrainingPhilosophy());
        profile.setExperienceStartDate(request.getExperienceStartDate());
        profile.setContactPhone(request.getContactPhone());
        profile.setTrainingMode(request.getTrainingMode());
        profile.setLocation(request.getLocation());
        profile.setRateUnit(request.getRateUnit());
        profile.setSpecializations(request.getSpecializations());
        profile.setCertifications(certs);
        profile.setHourlyRate(request.getHourlyRate());
        profile.setGender(request.getGender());
        profile.setCvUrl(request.getCvUrl());
        profile.setInstagramUrl(request.getInstagramUrl());
        profile.setLinkedinUrl(request.getLinkedinUrl());
        if (request.getPreferredGoals() != null) {
            profile.setPreferredGoals(request.getPreferredGoals());
        }
        if (request.getPreferredDietTypes() != null) {
            profile.setPreferredDietTypes(request.getPreferredDietTypes());
        }
    }

    @Override
    @Transactional
    public ApiResponse<String> uploadCertImage(UUID userId, MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.startsWith("image/") && !contentType.equals("application/pdf"))) {
            throw new BadRequestException("Chỉ chấp nhận ảnh (JPG, PNG) hoặc PDF");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new BadRequestException("File không được vượt quá 5MB");
        }
        try {
            String objectName = minioService.uploadFile(file, "pt-certs");
            String url = minioService.getPresignedUrl(objectName);
            log.info("Cert image uploaded for user: {}", userId);
            return ApiResponse.success(url, "Ảnh chứng chỉ đã tải lên thành công");
        } catch (Exception e) {
            throw new BadRequestException("Upload ảnh chứng chỉ thất bại: " + e.getMessage());
        }
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
    public ApiResponse<PtProfileSummary> updatePtProfile(UUID userId, UpdatePtProfileRequest request) {
        PtProfile ptProfile = ptProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("PtProfile", userId));

        if (request.getBio() != null) ptProfile.setBio(request.getBio());
        if (request.getTrainingPhilosophy() != null) ptProfile.setTrainingPhilosophy(request.getTrainingPhilosophy());
        if (request.getLocation() != null) ptProfile.setLocation(request.getLocation());
        if (request.getTrainingMode() != null) ptProfile.setTrainingMode(request.getTrainingMode());
        if (request.getHourlyRate() != null) ptProfile.setHourlyRate(request.getHourlyRate());
        if (request.getSpecializations() != null) ptProfile.setSpecializations(request.getSpecializations());
        if (request.getInstagramUrl() != null) ptProfile.setInstagramUrl(request.getInstagramUrl());
        if (request.getLinkedinUrl() != null) ptProfile.setLinkedinUrl(request.getLinkedinUrl());
        if (request.getPortfolioShowcase() != null) ptProfile.setPortfolioShowcase(request.getPortfolioShowcase());

        ptProfile = ptProfileRepository.save(ptProfile);
        log.info("PT Profile updated for user: {}", userId);
        
        return ApiResponse.success(toPtProfileSummary(ptProfile), "PT Profile updated successfully");
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

        if (request.getNutritionGoal() != null) {
            user.setNutritionGoal(request.getNutritionGoal());
            userRepository.save(user);
        }

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
                .allergyNotes(user.getAllergyNotes())
                .dietPreference(user.getDietPreference())
                .nutritionGoal(user.getNutritionGoal())
                .pregnancyTrimester(user.getPregnancyTrimester())
                .heightCm(user.getHeightCm())
                .gender(user.getGender())
                .notificationOptIn(user.getNotificationOptIn())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private PtProfileSummary toPtProfileSummary(PtProfile ptProfile) {
        return PtProfileSummary.builder()
                .id(ptProfile.getId())
                .isVerified(ptProfile.getIsVerified())
                .preferredTrack(ptProfile.getPreferredTrack())
                .bio(ptProfile.getBio())
                .trainingPhilosophy(ptProfile.getTrainingPhilosophy())
                .experienceStartDate(ptProfile.getExperienceStartDate())
                .yearsOfExperience(ptProfile.getYearsOfExperience())
                .contactPhone(ptProfile.getContactPhone())
                .trainingMode(ptProfile.getTrainingMode())
                .location(ptProfile.getLocation())
                .rateUnit(ptProfile.getRateUnit())
                .specializations(ptProfile.getSpecializations())
                .certifications(ptProfile.getCertifications())
                .rating(ptProfile.getRating())
                .totalReviews(ptProfile.getTotalReviews())
                .tier(ptProfile.getTier() != null ? ptProfile.getTier().name() : null)
                .hourlyRate(ptProfile.getHourlyRate())
                .portfolioShowcase(ptProfile.getPortfolioShowcase())
                .cvUrl(ptProfile.getCvUrl())
                .instagramUrl(ptProfile.getInstagramUrl())
                .linkedinUrl(ptProfile.getLinkedinUrl())
                .gender(ptProfile.getGender() != null ? ptProfile.getGender().name() : null)
                .adminRejectNote(ptProfile.getAdminRejectNote())
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

    @Override
    @Transactional
    public ApiResponse<String> uploadPortfolioImage(UUID userId, MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException("Chỉ chấp nhận định dạng file ảnh (JPG, PNG)");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new BadRequestException("Ảnh không được vượt quá 5MB");
        }
        try {
            String objectName = minioService.uploadFile(file, "portfolio-images");
            String presignedUrl = minioService.getPresignedUrl(objectName);

            log.info("Portfolio image uploaded for user: {}", userId);
            return ApiResponse.success(presignedUrl, "Tải ảnh thành công");
        } catch (Exception e) {
            throw new BadRequestException("Upload ảnh thất bại: " + e.getMessage());
        }
    }
}
