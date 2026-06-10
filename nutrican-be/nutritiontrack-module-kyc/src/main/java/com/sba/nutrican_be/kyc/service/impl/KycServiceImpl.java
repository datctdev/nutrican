package com.sba.nutrican_be.kyc.service.impl;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.entity.PtProfile;
import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.core.entity.UserKyc;
import com.sba.nutrican_be.core.enums.UserStatus;
import com.sba.nutrican_be.core.exception.BadRequestException;
import com.sba.nutrican_be.core.exception.ResourceNotFoundException;
import com.sba.nutrican_be.core.repository.PtProfileRepository;
import com.sba.nutrican_be.core.repository.UserKycRepository;
import com.sba.nutrican_be.core.repository.UserRepository;
import com.sba.nutrican_be.kyc.dto.request.KycRequest;
import com.sba.nutrican_be.kyc.dto.request.PtRequestDto;
import com.sba.nutrican_be.kyc.dto.response.KycStatusDto;
import com.sba.nutrican_be.kyc.service.KycService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class KycServiceImpl implements KycService {

    private final UserRepository userRepository;
    private final UserKycRepository userKycRepository;
    private final PtProfileRepository ptProfileRepository;

    @Override
    @Transactional
    public ApiResponse<Void> submitKyc(UUID userId, KycRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (Boolean.TRUE.equals(user.getIsKycVerified())) {
            throw new BadRequestException("KYC already verified");
        }

        if (userKycRepository.existsByIdCardNumber(request.getIdCardNumber())) {
            throw new BadRequestException("ID card number already submitted by another user");
        }

        if (userKycRepository.existsByUserId(userId)) {
            UserKyc existing = userKycRepository.findByUserId(userId).get();
            existing.setIdCardNumber(request.getIdCardNumber());
            existing.setFullNameOnCard(request.getFullNameOnCard());
            existing.setIdCardFrontUrl(request.getIdCardFrontUrl());
            existing.setIdCardBackUrl(request.getIdCardBackUrl());
            existing.setDateOfBirthOnCard(request.getDateOfBirthOnCard());
            existing.setAddressOnCard(request.getAddressOnCard());
            existing.setVerificationStatus(UserStatus.PENDING_APPROVAL);
            existing.setIsVerified(false);
            userKycRepository.save(existing);
        } else {
            UserKyc userKyc = UserKyc.builder()
                    .user(user)
                    .idCardNumber(request.getIdCardNumber())
                    .fullNameOnCard(request.getFullNameOnCard())
                    .idCardFrontUrl(request.getIdCardFrontUrl())
                    .idCardBackUrl(request.getIdCardBackUrl())
                    .dateOfBirthOnCard(request.getDateOfBirthOnCard())
                    .addressOnCard(request.getAddressOnCard())
                    .verificationStatus(UserStatus.PENDING_APPROVAL)
                    .isVerified(false)
                    .build();
            userKycRepository.save(userKyc);
        }

        user.setStatus(UserStatus.PENDING_APPROVAL);
        userRepository.save(user);
        log.info("KYC submitted by user {}: idCard={}", userId, request.getIdCardNumber());

        return ApiResponse.success(null, "KYC submitted successfully, pending approval");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<KycStatusDto> getKycStatus(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        UserKyc userKyc = userKycRepository.findByUserId(userId).orElse(null);

        KycStatusDto status;
        if (userKyc == null) {
            status = KycStatusDto.builder()
                    .isKycVerified(false)
                    .verificationStatus("NOT_SUBMITTED")
                    .build();
        } else {
            status = KycStatusDto.builder()
                    .isKycVerified(Boolean.TRUE.equals(userKyc.getIsVerified()))
                    .verificationStatus(userKyc.getVerificationStatus().name())
                    .rejectionReason(userKyc.getRejectionReason())
                    .reviewedAt(userKyc.getReviewedAt())
                    .build();
        }

        return ApiResponse.success(status);
    }

    @Override
    @Transactional
    public ApiResponse<Void> requestPt(UUID userId, PtRequestDto request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (!Boolean.TRUE.equals(user.getIsKycVerified())) {
            throw new BadRequestException("You must complete KYC verification before requesting PT status");
        }

        if (user.getPtProfile() != null) {
            throw new BadRequestException("PT request already submitted");
        }

        PtProfile profile = PtProfile.builder()
                .user(user)
                .bio(request.getBio())
                .trainingPhilosophy(request.getTrainingPhilosophy())
                .yearsOfExperience(request.getYearsOfExperience())
                .certifications(request.getCertifications())
                .cvUrl(request.getCvUrl())
                .specializations(request.getSpecializations())
                .ptRequestStatus(UserStatus.PENDING_APPROVAL)
                .verificationStatus(UserStatus.PENDING_APPROVAL)
                .isVerified(false)
                .build();

        ptProfileRepository.save(profile);
        log.info("PT request submitted by user {}", userId);

        return ApiResponse.success(null, "PT request submitted successfully, pending admin approval");
    }
}
