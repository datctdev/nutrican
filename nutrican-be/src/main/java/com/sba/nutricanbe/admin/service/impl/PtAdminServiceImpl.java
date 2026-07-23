package com.sba.nutricanbe.admin.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sba.nutricanbe.admin.dto.PendingPtDto;
import com.sba.nutricanbe.admin.dto.PtVerificationRequest;
import com.sba.nutricanbe.admin.service.PtAdminService;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.common.enums.RequestStatus;
import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.user.dto.CertificationData;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.PtUpdateRequest;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.Gender;
import com.sba.nutricanbe.user.enums.Tier;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.repository.PtUpdateRequestRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PtAdminServiceImpl implements PtAdminService {

    private final UserRepository userRepository;
    private final PtProfileRepository ptProfileRepository;
    private final PtUpdateRequestRepository ptUpdateRequestRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<PendingPtDto>> getPendingPts(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<PtProfile> profilePage = ptProfileRepository.findByPtRequestStatus(
                UserStatus.PENDING_APPROVAL, pageable);

        return ApiResponse.success(PageResponse.from(profilePage.map(this::toPendingPtDto)));
    }

    @Override
    @Transactional
    public ApiResponse<Void> verifyPt(UUID userId, PtVerificationRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        PtProfile profile = ptProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("PT Profile for user", userId));

        String action = request.getAction();
        String ptType = request.getPtType();

        if (action == null) {
            Boolean isApproved = request.getIsVerified() != null ? request.getIsVerified() : request.getApproved();
            if (isApproved != null) {
                action = isApproved ? "APPROVE" : "REJECT";
                if ("APPROVE".equals(action) && request.getPtType() != null) {
                    ptType = request.getPtType().replace("PT_", "");
                }
            }
        }

        if (action == null) {
            throw new BadRequestException("Action is required");
        }

        switch (action.toUpperCase()) {
            case "APPROVE" -> {
                if ("FREELANCE".equalsIgnoreCase(ptType)) {
                    user.setRole(UserRole.PT_FREELANCE);
                    profile.setTier(Tier.TIER_2);
                } else {
                    user.setRole(UserRole.PT_CERTIFIED);
                    profile.setTier(Tier.TIER_1);
                }
                user.setStatus(UserStatus.ACTIVE);
                profile.setIsVerified(true);
                profile.setVerificationStatus(UserStatus.ACTIVE);
                profile.setPtRequestStatus(UserStatus.ACTIVE);
                log.info("PT {} approved as {} by admin", userId, ptType);
            }
            case "REJECT" -> {
                profile.setVerificationStatus(UserStatus.SUSPENDED);
                profile.setPtRequestStatus(UserStatus.SUSPENDED);
                profile.setIsVerified(false);
                profile.setAdminRejectNote(request.getAdminNote());
                log.info("PT {} rejected by admin", userId);
            }
            default -> throw new BadRequestException("Invalid action: " + action);
        }

        userRepository.save(user);
        ptProfileRepository.save(profile);
        return ApiResponse.success(null, "PT verification processed");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<PendingPtDto>> getPtDocuments(UUID ptId) {
        PtProfile profile = ptProfileRepository.findByIdWithUser(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT Profile", ptId));
        PendingPtDto dto = toPendingPtDto(profile);
        PageResponse<PendingPtDto> response = PageResponse.<PendingPtDto>builder()
                .content(java.util.List.of(dto))
                .page(0)
                .size(1)
                .totalElements(1)
                .totalPages(1)
                .first(true)
                .last(true)
                .build();
        return ApiResponse.success(response);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<Map<String, Object>>> getPendingUpdateRequests(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<PtUpdateRequest> reqPage = ptUpdateRequestRepository.findByStatus(RequestStatus.PENDING, pageable);

        Page<Map<String, Object>> responsePage = reqPage.map(req -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", req.getId());
            map.put("ptId", req.getPt().getId());
            map.put("ptName", req.getPt().getFullName());
            map.put("ptAvatar", req.getPt().getAvatarUrl());
            map.put("requestedData", req.getRequestedData());
            map.put("reason", req.getReason());
            map.put("status", req.getStatus());
            map.put("createdAt", req.getCreatedAt());
            return map;
        });

        return ApiResponse.success(PageResponse.from(responsePage));
    }

    @Override
    @Transactional
    public ApiResponse<Void> reviewUpdateRequest(UUID requestId, String action, String adminNote) {
        PtUpdateRequest req = ptUpdateRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("PtUpdateRequest", requestId));

        if ("APPROVE".equalsIgnoreCase(action)) {
            PtProfile profile = ptProfileRepository.findByUserId(req.getPt().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("PtProfile", req.getPt().getId()));

            applyUpdatesToProfile(profile, req.getRequestedData());
            req.setStatus(RequestStatus.APPROVED);
            ptProfileRepository.save(profile);
            log.info("Admin approved PT profile update for PT ID: {}", req.getPt().getId());
        } else if ("REJECT".equalsIgnoreCase(action)) {
            req.setStatus(RequestStatus.REJECTED);
            req.setAdminNote(adminNote);
            log.info("Admin rejected PT profile update for PT ID: {}", req.getPt().getId());
        } else {
            throw new BadRequestException("Invalid action. Must be APPROVE or REJECT");
        }

        ptUpdateRequestRepository.save(req);
        return ApiResponse.success(null, "Yêu cầu cập nhật hồ sơ đã được xử lý");
    }

    @SuppressWarnings("unchecked")
    private void applyUpdatesToProfile(PtProfile profile, Map<String, Object> data) {
        if (data.containsKey("bio")) profile.setBio((String) data.get("bio"));
        if (data.containsKey("trainingPhilosophy")) profile.setTrainingPhilosophy((String) data.get("trainingPhilosophy"));
        if (data.containsKey("contactPhone")) profile.setContactPhone((String) data.get("contactPhone"));
        if (data.containsKey("location")) profile.setLocation((String) data.get("location"));
        if (data.containsKey("instagramUrl")) profile.setInstagramUrl((String) data.get("instagramUrl"));
        if (data.containsKey("linkedinUrl")) profile.setLinkedinUrl((String) data.get("linkedinUrl"));
        if (data.containsKey("cvUrl")) profile.setCvUrl((String) data.get("cvUrl"));

        if (data.containsKey("gender") && data.get("gender") != null && !data.get("gender").toString().isBlank()) {
            Gender newGender = Gender.valueOf(data.get("gender").toString().toUpperCase());
            profile.setGender(newGender);
            if (profile.getUser() != null) {
                profile.getUser().setGender(newGender.name());
                userRepository.save(profile.getUser());
            }
        }

        TrainingMode currentMode = profile.getTrainingMode();
        if (data.containsKey("trainingMode") && data.get("trainingMode") != null) {
            String modeStr = data.get("trainingMode").toString().toUpperCase();
            if ("HYBRID".equals(modeStr)) modeStr = "BOTH";
            currentMode = TrainingMode.valueOf(modeStr);
            profile.setTrainingMode(currentMode);
        }

        String unit = data.containsKey("rateUnit") && data.get("rateUnit") != null ? data.get("rateUnit").toString() : null;
        BigDecimal rate = data.containsKey("hourlyRate") && data.get("hourlyRate") != null && !data.get("hourlyRate").toString().isBlank()
                ? new BigDecimal(data.get("hourlyRate").toString()) : null;

        if (rate != null) {
            if (currentMode == TrainingMode.ONLINE || currentMode == TrainingMode.BOTH) {
                profile.setOnlineRate(rate);
                if (unit != null) profile.setOnlineRateUnit(unit);
            }
            if (currentMode == TrainingMode.OFFLINE || currentMode == TrainingMode.BOTH) {
                profile.setOfflineRate(rate);
                if (unit != null) profile.setOfflineRateUnit(unit);
            }
        }

        if (data.containsKey("experienceStartDate") && data.get("experienceStartDate") != null) {
            String dateStr = data.get("experienceStartDate").toString();
            if (dateStr.length() == 7) dateStr += "-01";
            profile.setExperienceStartDate(LocalDate.parse(dateStr));
        }

        if (data.containsKey("specializations") && data.get("specializations") != null) {
            profile.setSpecializations((List<String>) data.get("specializations"));
        }
        if (data.containsKey("preferredGoals") && data.get("preferredGoals") != null) {
            profile.setPreferredGoals((List<String>) data.get("preferredGoals"));
        }
        if (data.containsKey("preferredDietTypes") && data.get("preferredDietTypes") != null) {
            profile.setPreferredDietTypes((List<String>) data.get("preferredDietTypes"));
        }

        if (data.containsKey("certifications") && data.get("certifications") != null) {
            List<CertificationData> certs = objectMapper.convertValue(
                    data.get("certifications"), new com.fasterxml.jackson.core.type.TypeReference<List<CertificationData>>() {});
            profile.setCertifications(certs);
        }
    }

    private PendingPtDto toPendingPtDto(PtProfile profile) {
        User user = profile.getUser();
        return PendingPtDto.builder()
                .id(profile.getId())
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .preferredTrack(profile.getPreferredTrack())
                .bio(profile.getBio())
                .trainingPhilosophy(profile.getTrainingPhilosophy())
                .contactPhone(profile.getContactPhone())
                .experienceStartDate(profile.getExperienceStartDate())
                .yearsOfExperience(profile.getYearsOfExperience())
                .specializations(profile.getSpecializations())
                .trainingMode(profile.getTrainingMode())
                .location(profile.getLocation())
                .onlineRate(profile.getOnlineRate())
                .onlineRateUnit(profile.getOnlineRateUnit())
                .offlineRate(profile.getOfflineRate())
                .offlineRateUnit(profile.getOfflineRateUnit())
                .certifications(profile.getCertifications())
                .cvUrl(profile.getCvUrl())
                .instagramUrl(profile.getInstagramUrl())
                .linkedinUrl(profile.getLinkedinUrl())
                .gender(profile.getGender() != null ? profile.getGender().name() : null)
                .adminRejectNote(profile.getAdminRejectNote())
                .documentUrls(profile.getDocumentUrls())
                .verificationStatus(profile.getVerificationStatus().name())
                .createdAt(profile.getCreatedAt())
                .build();
    }
}