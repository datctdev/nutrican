package com.sba.nutricanbe.admin.service.impl;

import com.sba.nutricanbe.admin.dto.PendingPtDto;
import com.sba.nutricanbe.admin.dto.PtVerificationRequest;
import com.sba.nutricanbe.admin.service.PtAdminService;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.Tier;
import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PtAdminServiceImpl implements PtAdminService {

    private final UserRepository userRepository;
    private final PtProfileRepository ptProfileRepository;

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
            Boolean isApproved = request.getIsVerified() != null ? request.getIsVerified()
                    : request.getApproved();
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
                .hourlyRate(profile.getHourlyRate())
                .rateUnit(profile.getRateUnit())
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
