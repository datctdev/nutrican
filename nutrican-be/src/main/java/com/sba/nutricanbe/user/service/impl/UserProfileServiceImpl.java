package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.enums.RequestStatus;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.user.dto.*;
import com.sba.nutricanbe.user.entity.MacroTarget;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.PtUpdateRequest;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.util.MacroCalorieValidator;
import com.sba.nutricanbe.user.repository.MacroTargetRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.repository.PtUpdateRequestRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.infrastructure.storage.StorageService;
import com.sba.nutricanbe.user.enums.ActivityLevel;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.service.PtVenueAvailabilityService;
import com.sba.nutricanbe.user.service.UserProfileService;
import com.sba.nutricanbe.common.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
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
    private final PtVenueAvailabilityService venueAvailabilityService;
    private final PtUpdateRequestRepository ptUpdateRequestRepository;
    private final DietLogHelper dietLogHelper;

    @Override
    @Transactional
    public ApiResponse<PtProfileSummary> updatePtProfile(
            UUID userId,
            UpdatePtProfileRequest request
    ) {
        PtProfile ptProfile = ptProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("PtProfile", userId));

        if (request.getOnlineRate() != null
                && request.getOnlineRate().compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Phí huấn luyện online không được âm");
        }
        if (request.getOfflineRate() != null
                && request.getOfflineRate().compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Phí huấn luyện offline không được âm");
        }

        if (request.getBio() != null) {
            ptProfile.setBio(request.getBio());
        }

        if (request.getTrainingPhilosophy() != null) {
            ptProfile.setTrainingPhilosophy(request.getTrainingPhilosophy());
        }

        if (request.getContactPhone() != null) {
            ptProfile.setContactPhone(request.getContactPhone());
        }

        if (request.getLocation() != null) {
            ptProfile.setLocation(request.getLocation());
        }

        if (request.getTrainingMode() != null) {
            ptProfile.setTrainingMode(request.getTrainingMode());
        }

        if (request.getOnlineRate() != null) {
            ptProfile.setOnlineRate(request.getOnlineRate());
        }

        if (request.getOnlineRateUnit() != null) {
            ptProfile.setOnlineRateUnit(request.getOnlineRateUnit());
        }

        if (request.getOfflineRate() != null) {
            ptProfile.setOfflineRate(request.getOfflineRate());
        }

        if (request.getOfflineRateUnit() != null) {
            ptProfile.setOfflineRateUnit(request.getOfflineRateUnit());
        }

        if (request.getSpecializations() != null) {
            ptProfile.setSpecializations(request.getSpecializations());
        }

        if (request.getInstagramUrl() != null) {
            ptProfile.setInstagramUrl(request.getInstagramUrl());
        }

        if (request.getLinkedinUrl() != null) {
            ptProfile.setLinkedinUrl(request.getLinkedinUrl());
        }

        if (request.getPortfolioShowcase() != null) {
            ptProfile.setPortfolioShowcase(request.getPortfolioShowcase());
        }

        PtProfile savedProfile = ptProfileRepository.save(ptProfile);

        log.info("PT profile updated for user: {}", userId);

        return ApiResponse.success(
                toPtProfileSummary(savedProfile),
                "PT Profile updated successfully"
        );
    }

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
        validateAndNormalizeServiceRates(request);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        boolean requireKyc = systemSettingRepository.findById("REQUIRE_KYC_FOR_PT")
                .map(setting -> Boolean.parseBoolean(setting.getValue()))
                .orElse(true);

        if (requireKyc && (user.getIsKycVerified() == null || !user.getIsKycVerified())) {
            throw new BadRequestException("Bạn phải xác thực danh tính (KYC) trước khi đăng ký làm PT");
        }

        if (ptProfileRepository.findByUserId(userId).isPresent()) {
            throw new BadRequestException("User already has a PT profile");
        }

        List<CertificationData> certDataList = mapCerts(request);

        if ("CERTIFIED".equalsIgnoreCase(request.getPreferredTrack())) {
            if (certDataList == null || certDataList.isEmpty()) {
                throw new BadRequestException("PT Chuyên nghiệp (Certified) yêu cầu tối thiểu 1 chứng chỉ");
            }
        }


        PtProfile ptProfile = PtProfile.builder()
                .user(user)
                .preferredTrack(request.getPreferredTrack())
                .bio(request.getBio())
                .trainingPhilosophy(request.getTrainingPhilosophy())
                .experienceStartDate(request.getExperienceStartDate())
                .contactPhone(request.getContactPhone())
                .trainingMode(request.getTrainingMode())
                .location(request.getLocation())
                .onlineRate(request.getOnlineRate())
                .onlineRateUnit(request.getOnlineRateUnit())
                .offlineRate(request.getOfflineRate())
                .offlineRateUnit(request.getOfflineRateUnit())
                .specializations(request.getSpecializations())
                .certifications(certDataList)
                .gender(request.getGender())
                .cvUrl(request.getCvUrl())
                .instagramUrl(request.getInstagramUrl())
                .linkedinUrl(request.getLinkedinUrl())
                .isVerified(false)
                .build();

        ptProfile = ptProfileRepository.save(ptProfile);
        if (request.getTrainingMode() == TrainingMode.OFFLINE
                || request.getTrainingMode() == TrainingMode.BOTH) {
            venueAvailabilityService.setupOfflineScheduleFromRegistration(
                    ptProfile,
                    request.getVenues(),
                    request.getAvailabilityWindows(),
                    request.getOfflineRateUnit());
        }
        log.info("PT profile created for user: {}", userId);

        return ApiResponse.success(toPtProfileSummary(ptProfile), "PT registration submitted successfully");
    }

    @Override
    @Transactional
    public ApiResponse<PtProfileSummary> resubmitPt(UUID userId, PtRegistrationRequest request) {
        validateAndNormalizeServiceRates(request);
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
        if (request.getTrainingMode() == TrainingMode.OFFLINE
                || request.getTrainingMode() == TrainingMode.BOTH) {
            venueAvailabilityService.setupOfflineScheduleFromRegistration(
                    profile,
                    request.getVenues(),
                    request.getAvailabilityWindows(),
                    request.getOfflineRateUnit());
        }
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
        profile.setOnlineRate(request.getOnlineRate());
        profile.setOnlineRateUnit(request.getOnlineRateUnit());
        profile.setOfflineRate(request.getOfflineRate());
        profile.setOfflineRateUnit(request.getOfflineRateUnit());
        profile.setSpecializations(request.getSpecializations());
        profile.setCertifications(certs);
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
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("application/pdf") &&
                !contentType.equals("application/msword") &&
                !contentType.contains("word") &&
                !contentType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))) {
            throw new BadRequestException("Only PDF and Word documents are allowed");
        }

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
    public ApiResponse<MacroTargetResponse> setMacroTargetForSelf(UUID userId, MacroTargetRequest request) {
        if (dietLogHelper.hasActivePt(userId)) {
            throw new BadRequestException(
                    "Mục tiêu dinh dưỡng đang do PT quản lý — liên hệ PT để thay đổi macro");
        }
        return setMacroTarget(userId, request);
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

        MacroCalorieValidator.validateWithinTolerance(
                target.getDailyCalories(), target.getProtein(), target.getCarb(), target.getFat());

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
                .activityLevel(ActivityLevel.orDefault(user.getActivityLevel()))
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
                .onlineRate(ptProfile.getOnlineRate())
                .onlineRateUnit(ptProfile.getOnlineRateUnit())
                .offlineRate(ptProfile.getOfflineRate())
                .offlineRateUnit(ptProfile.getOfflineRateUnit())
                .specializations(ptProfile.getSpecializations())
                .certifications(ptProfile.getCertifications())
                .rating(ptProfile.getRating())
                .totalReviews(ptProfile.getTotalReviews())
                .tier(ptProfile.getTier() != null ? ptProfile.getTier().name() : null)
                .cvUrl(ptProfile.getCvUrl())
                .instagramUrl(ptProfile.getInstagramUrl())
                .linkedinUrl(ptProfile.getLinkedinUrl())
                .gender(ptProfile.getGender() != null ? ptProfile.getGender().name() : null)
                .adminRejectNote(ptProfile.getAdminRejectNote())
                .ptRequestStatus(ptProfile.getPtRequestStatus() != null ? ptProfile.getPtRequestStatus().name() : null)
                .verificationStatus(ptProfile.getVerificationStatus() != null ? ptProfile.getVerificationStatus().name() : null)
                .build();
    }

    private void validateAndNormalizeServiceRates(PtRegistrationRequest request) {
        TrainingMode mode = request.getTrainingMode();
        if (mode == null) {
            throw new BadRequestException("Vui lòng chọn hình thức huấn luyện");
        }

        boolean supportsOnline = mode == TrainingMode.ONLINE || mode == TrainingMode.BOTH;
        boolean supportsOffline = mode == TrainingMode.OFFLINE || mode == TrainingMode.BOTH;

        if (supportsOnline) {
            request.setOnlineRateUnit("MONTH");
            validateRate("online", request.getOnlineRate(), request.getOnlineRateUnit());
        } else {
            request.setOnlineRate(null);
            request.setOnlineRateUnit(null);
        }

        if (supportsOffline) {
            String offlineUnit = request.getOfflineRateUnit();
            if (offlineUnit == null || offlineUnit.isBlank()) {
                request.setOfflineRateUnit("SESSION_60");
            } else {
                offlineUnit = offlineUnit.trim().toUpperCase(Locale.ROOT);
                if (!offlineUnit.equals("SESSION_60") && !offlineUnit.equals("SESSION_90")) {
                    throw new BadRequestException("Offline price must be per session (60 or 90 minutes)");
                }
                request.setOfflineRateUnit(offlineUnit);
            }
            validateRate("offline", request.getOfflineRate(), request.getOfflineRateUnit());
            if (request.getLocation() == null || request.getLocation().isBlank()) {
                throw new BadRequestException("Vui lòng chọn địa điểm huấn luyện offline");
            }
            request.setLocation(request.getLocation().trim());
            if (request.getVenues() == null || request.getVenues().isEmpty()) {
                throw new BadRequestException("Vui lòng thêm ít nhất một địa điểm tập");
            }
            if (request.getAvailabilityWindows() == null || request.getAvailabilityWindows().isEmpty()) {
                throw new BadRequestException("Vui lòng thiết lập lịch nhận học viên trong tuần");
            }
        } else {
            request.setOfflineRate(null);
            request.setOfflineRateUnit(null);
            request.setLocation(null);
            request.setVenues(null);
            request.setAvailabilityWindows(null);
        }
    }

    private void validateRate(String mode, BigDecimal rate, String rateUnit) {
        if (rate == null || rate.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Phí huấn luyện " + mode + " phải lớn hơn 0");
        }
        if (rateUnit == null || rateUnit.isBlank()) {
            throw new BadRequestException("Vui lòng chọn đơn vị tính cho hình thức " + mode);
        }
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

    @Override
    @Transactional
    public ApiResponse<PtUpdateRequestDto> submitPtUpdateRequest(UUID ptId, SubmitPtUpdateRequest request) {
        boolean hasPending = ptUpdateRequestRepository.existsByPtIdAndStatus(ptId, RequestStatus.PENDING);
        if (hasPending) {
            throw new BadRequestException("Bạn đang có 1 yêu cầu cập nhật chờ duyệt. Vui lòng chờ Admin xử lý trước khi gửi yêu cầu mới.");
        }

        PtUpdateRequest newRequest = PtUpdateRequest.builder()
                .pt(userRepository.getReferenceById(ptId))
                .requestedData(request.getRequestedData())
                .reason(request.getReason())
                .status(RequestStatus.PENDING)
                .build();

        newRequest = ptUpdateRequestRepository.save(newRequest);
        return ApiResponse.success(PtUpdateRequestDto.fromEntity(newRequest), "Đã gửi yêu cầu cập nhật thành công!");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PtUpdateRequestDto> getPendingPtUpdateRequest(UUID ptId) {
        return ptUpdateRequestRepository.findFirstByPtIdOrderByCreatedAtDesc(ptId)
                .filter(req -> req.getStatus() == RequestStatus.PENDING || req.getStatus() == RequestStatus.REJECTED)
                .map(req -> ApiResponse.success(PtUpdateRequestDto.fromEntity(req)))
                .orElse(ApiResponse.<PtUpdateRequestDto>success(null));
    }
}
