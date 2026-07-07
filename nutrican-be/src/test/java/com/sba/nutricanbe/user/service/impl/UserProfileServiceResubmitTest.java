package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.user.dto.PtRegistrationRequest;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.Gender;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.repository.MacroTargetRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.common.repository.SystemSettingRepository;
import com.sba.nutricanbe.infrastructure.storage.StorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserProfileServiceResubmitTest {

    @Mock private UserRepository userRepository;
    @Mock private MacroTargetRepository macroTargetRepository;
    @Mock private PtProfileRepository ptProfileRepository;
    @Mock private StorageService minioService;
    @Mock private SystemSettingRepository systemSettingRepository;

    @InjectMocks
    private UserProfileServiceImpl userProfileService;

    @Test
    void resubmitSuspendedProfileSetsPendingApproval() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        ReflectionTestUtils.setField(user, "id", userId);
        user.setIsKycVerified(true);

        PtProfile profile = new PtProfile();
        profile.setPtRequestStatus(UserStatus.SUSPENDED);
        profile.setVerificationStatus(UserStatus.SUSPENDED);
        profile.setAdminRejectNote("Thiếu chứng chỉ");

        PtRegistrationRequest request = PtRegistrationRequest.builder()
                .preferredTrack("FREELANCE")
                .bio("x".repeat(100))
                .trainingPhilosophy("y".repeat(50))
                .contactPhone("0901234567")
                .gender(Gender.MALE)
                .experienceStartDate(LocalDate.of(2020, 1, 1))
                .trainingMode(TrainingMode.ONLINE)
                .location("Hà Nội")
                .hourlyRate(BigDecimal.valueOf(200000))
                .rateUnit("HOUR")
                .specializations(List.of("Giảm cân"))
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(ptProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(systemSettingRepository.findById("REQUIRE_KYC_FOR_PT")).thenReturn(Optional.empty());
        when(ptProfileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var response = userProfileService.resubmitPt(userId, request);

        assertEquals(UserStatus.PENDING_APPROVAL, profile.getPtRequestStatus());
        assertEquals(UserStatus.PENDING_APPROVAL, profile.getVerificationStatus());
        assertEquals(null, profile.getAdminRejectNote());
        assertEquals("PT profile resubmitted", response.getMessage());
    }

    @Test
    void resubmitActiveProfileThrowsBadRequest() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        ReflectionTestUtils.setField(user, "id", userId);
        user.setIsKycVerified(true);

        PtProfile profile = new PtProfile();
        profile.setPtRequestStatus(UserStatus.ACTIVE);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(ptProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

        assertThrows(BadRequestException.class, () ->
                userProfileService.resubmitPt(userId, PtRegistrationRequest.builder().preferredTrack("FREELANCE").build()));
    }
}
