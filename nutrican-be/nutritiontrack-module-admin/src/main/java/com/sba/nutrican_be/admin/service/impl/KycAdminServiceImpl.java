package com.sba.nutrican_be.admin.service.impl;

import com.sba.nutrican_be.admin.dto.PendingKycDto;
import com.sba.nutrican_be.admin.service.KycAdminService;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.core.entity.UserKyc;
import com.sba.nutrican_be.core.enums.UserStatus;
import com.sba.nutrican_be.core.exception.ResourceNotFoundException;
import com.sba.nutrican_be.core.repository.UserKycRepository;
import com.sba.nutrican_be.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class KycAdminServiceImpl implements KycAdminService {

    private final UserRepository userRepository;
    private final UserKycRepository userKycRepository;

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<PendingKycDto>> getPendingKycs(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<UserKyc> kycPage = userKycRepository.findByVerificationStatus(
                UserStatus.PENDING_APPROVAL, pageable);

        return ApiResponse.success(PageResponse.from(kycPage.map(this::toPendingKycDto)));
    }

    @Override
    @Transactional
    public ApiResponse<Void> approveKyc(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        UserKyc userKyc = userKycRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("KYC record for user", userId));

        user.setIsKycVerified(true);
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);

        userKyc.setIsVerified(true);
        userKyc.setVerificationStatus(UserStatus.ACTIVE);
        userKyc.setReviewedAt(LocalDateTime.now());
        userKycRepository.save(userKyc);

        log.info("KYC approved for user {} by admin", userId);
        return ApiResponse.success(null, "KYC approved successfully");
    }

    @Override
    @Transactional
    public ApiResponse<Void> rejectKyc(UUID userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        UserKyc userKyc = userKycRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("KYC record for user", userId));

        user.setStatus(UserStatus.SUSPENDED);
        userRepository.save(user);

        userKyc.setIsVerified(false);
        userKyc.setVerificationStatus(UserStatus.SUSPENDED);
        userKyc.setRejectionReason(reason);
        userKyc.setReviewedAt(LocalDateTime.now());
        userKycRepository.save(userKyc);

        log.info("KYC rejected for user {} by admin: {}", userId, reason);
        return ApiResponse.success(null, "KYC rejected");
    }

    private PendingKycDto toPendingKycDto(UserKyc kyc) {
        User user = kyc.getUser();
        return PendingKycDto.builder()
                .id(kyc.getId())
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .idCardNumber(kyc.getIdCardNumber())
                .fullNameOnCard(kyc.getFullNameOnCard())
                .dateOfBirthOnCard(kyc.getDateOfBirthOnCard())
                .addressOnCard(kyc.getAddressOnCard())
                .idCardFrontUrl(kyc.getIdCardFrontUrl())
                .idCardBackUrl(kyc.getIdCardBackUrl())
                .verificationStatus(kyc.getVerificationStatus().name())
                .createdAt(kyc.getCreatedAt())
                .build();
    }
}
