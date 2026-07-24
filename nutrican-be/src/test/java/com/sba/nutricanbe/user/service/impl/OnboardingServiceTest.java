package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.user.dto.MacroTargetResponse;
import com.sba.nutricanbe.user.dto.OnboardingRequest;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.DietPreference;
import com.sba.nutricanbe.user.enums.NutritionGoal;
import com.sba.nutricanbe.user.repository.MacroTargetRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.BodyMetricService;
import com.sba.nutricanbe.user.service.UserProfileService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OnboardingServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private MacroTargetRepository macroTargetRepository;
    @Mock private BodyMetricService bodyMetricService;
    @Mock private UserProfileService userProfileService;
    @Mock private com.sba.nutricanbe.user.service.ClientGoalService clientGoalService;

    @InjectMocks
    private OnboardingServiceImpl service;

    @Test
    void step2CreatesMacroTarget() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .heightCm(170)
                .gender("male")
                .nutritionGoal(NutritionGoal.WEIGHT_LOSS)
                .onboardingStep(2)
                .build();
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(macroTargetRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(userProfileService.setMacroTarget(any(), any())).thenReturn(
                ApiResponse.success(MacroTargetResponse.builder().dailyCalories(BigDecimal.valueOf(1800)).build()));

        OnboardingRequest req = new OnboardingRequest();
        req.setStep(2);
        req.setNutritionGoal(NutritionGoal.WEIGHT_LOSS);
        req.setDietPreference(DietPreference.NORMAL);
        req.setActivityLevel(com.sba.nutricanbe.user.enums.ActivityLevel.ACTIVE);

        var status = service.submitStep(userId, req);
        assertEquals(3, status.getStep());
        assertEquals(com.sba.nutricanbe.user.enums.ActivityLevel.ACTIVE, user.getActivityLevel());
        verify(userProfileService).setMacroTarget(eq(userId), any());
    }

    @Test
    void skipDoesNotMarkCompleted() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().onboardingStep(1).build();
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(macroTargetRepository.findByUserId(userId)).thenReturn(Optional.empty());

        var status = service.skip(userId);
        assertFalse(status.isCompleted());
        assertTrue(status.isShowBanner());
        assertFalse(status.isForceRedirect());
    }

    @Test
    void step1SavesBodyMetrics() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().onboardingStep(1).build();
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(macroTargetRepository.findByUserId(userId)).thenReturn(Optional.empty());

        OnboardingRequest req = new OnboardingRequest();
        req.setStep(1);
        req.setHeightCm(175);
        req.setWeightKg(BigDecimal.valueOf(70));
        req.setGender("female");
        req.setDateOfBirth(LocalDate.of(1998, 1, 1));

        var status = service.submitStep(userId, req);
        assertEquals(2, status.getStep());
        verify(bodyMetricService).recordMetric(eq(userId), any());
    }
}
