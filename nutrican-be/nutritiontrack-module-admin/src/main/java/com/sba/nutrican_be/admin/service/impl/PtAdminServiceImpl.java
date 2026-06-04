package com.sba.nutrican_be.admin.service.impl;

import com.sba.nutrican_be.admin.dto.PendingPtDto;
import com.sba.nutrican_be.admin.dto.PtVerificationRequest;
import com.sba.nutrican_be.admin.service.PtAdminService;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.core.entity.PtProfile;
import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.core.enums.Tier;
import com.sba.nutrican_be.core.enums.UserRole;
import com.sba.nutrican_be.core.enums.UserStatus;
import com.sba.nutrican_be.core.exception.BadRequestException;
import com.sba.nutrican_be.core.exception.ResourceNotFoundException;
import com.sba.nutrican_be.core.repository.PtProfileRepository;
import com.sba.nutrican_be.core.repository.UserRepository;
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
                user.setStatus(UserStatus.SUSPENDED);
                profile.setVerificationStatus(UserStatus.SUSPENDED);
                profile.setPtRequestStatus(UserStatus.SUSPENDED);
                profile.setIsVerified(false);
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
        return ApiResponse.success(PageResponse.from(
                Page.of(java.util.List.of(toPendingPtDto(profile)), 0, 1, 1));
    }

    private PendingPtDto toPendingPtDto(PtProfile profile) {
        User user = profile.getUser();
        return PendingPtDto.builder()
                .id(profile.getId())
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .bio(profile.getBio())
                .trainingPhilosophy(profile.getTrainingPhilosophy())
                .yearsOfExperience(profile.getYearsOfExperience())
                .certifications(profile.getCertifications())
                .cvUrl(profile.getCvUrl())
                .documentUrls(profile.getDocumentUrls())
                .verificationStatus(profile.getVerificationStatus().name())
                .createdAt(profile.getCreatedAt())
                .build();
    }
}
