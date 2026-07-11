package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.util.MacroSuggestionCalculator;
import com.sba.nutricanbe.user.dto.BodyMetricRequest;
import com.sba.nutricanbe.user.dto.MacroSuggestionResponse;
import com.sba.nutricanbe.user.dto.MacroTargetRequest;
import com.sba.nutricanbe.user.dto.OnboardingRequest;
import com.sba.nutricanbe.user.dto.OnboardingStatusDto;
import com.sba.nutricanbe.user.entity.MacroTarget;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.repository.MacroTargetRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.BodyMetricService;
import com.sba.nutricanbe.user.service.OnboardingService;
import com.sba.nutricanbe.user.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OnboardingServiceImpl implements OnboardingService {

    private final UserRepository userRepository;
    private final MacroTargetRepository macroTargetRepository;
    private final BodyMetricService bodyMetricService;
    private final UserProfileService userProfileService;

    @Override
    @Transactional(readOnly = true)
    public OnboardingStatusDto getStatus(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        return buildStatus(user);
    }

    @Override
    @Transactional
    public OnboardingStatusDto submitStep(UUID userId, OnboardingRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        if (user.getOnboardingCompletedAt() != null) {
            return buildStatus(user);
        }
        int step = request.getStep();
        switch (step) {
            case 1 -> applyStep1(user, request);
            case 2 -> applyStep2(user, request);
            case 3 -> applyStep3(user);
            default -> throw new BadRequestException("Invalid onboarding step: " + step);
        }
        user = userRepository.save(user);
        return buildStatus(user);
    }

    @Override
    @Transactional
    public OnboardingStatusDto skip(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        user.setOnboardingSkippedAt(LocalDateTime.now());
        user.setOnboardingStep(null);
        user = userRepository.save(user);
        return buildStatus(user);
    }

    private void applyStep1(User user, OnboardingRequest request) {
        if (request.getHeightCm() == null || request.getHeightCm() <= 0) {
            throw new BadRequestException("heightCm is required");
        }
        if (request.getWeightKg() == null || request.getWeightKg().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("weightKg is required");
        }
        if (request.getGender() == null || request.getGender().isBlank()) {
            throw new BadRequestException("gender is required");
        }
        user.setHeightCm(request.getHeightCm());
        user.setGender(request.getGender());
        if (request.getDateOfBirth() != null) {
            user.setDateOfBirth(request.getDateOfBirth());
        }
        BodyMetricRequest bm = new BodyMetricRequest();
        bm.setWeight(request.getWeightKg());
        bodyMetricService.recordMetric(user.getId(), bm);
        user.setOnboardingStep(2);
        user.setOnboardingSkippedAt(null);
    }

    private void applyStep2(User user, OnboardingRequest request) {
        if (request.getNutritionGoal() != null) {
            user.setNutritionGoal(request.getNutritionGoal());
        }
        if (request.getDietPreference() != null) {
            user.setDietPreference(request.getDietPreference());
        }
        if (request.getPregnancyTrimester() != null) {
            user.setPregnancyTrimester(request.getPregnancyTrimester());
        }
        BigDecimal activityFactor = request.getActivityFactor() != null ? request.getActivityFactor() : BigDecimal.valueOf(1.55);
        MacroSuggestionResponse suggestion = MacroSuggestionCalculator.calculate(
                user,
                request.getWeightKg(),
                user.getHeightCm() != null ? BigDecimal.valueOf(user.getHeightCm()) : null,
                null,
                user.getGender(),
                activityFactor,
                request.getNutritionGoal(),
                request.getPregnancyTrimester());
        MacroTargetRequest macroReq = new MacroTargetRequest();
        macroReq.setDailyCalories(suggestion.getDailyCalories());
        macroReq.setProtein(suggestion.getProtein());
        macroReq.setCarb(suggestion.getCarb());
        macroReq.setFat(suggestion.getFat());
        userProfileService.setMacroTarget(user.getId(), macroReq);
        user.setOnboardingStep(3);
    }

    private void applyStep3(User user) {
        user.setOnboardingCompletedAt(LocalDateTime.now());
        user.setOnboardingStep(null);
        user.setOnboardingSkippedAt(null);
    }

    private OnboardingStatusDto buildStatus(User user) {
        boolean completed = user.getOnboardingCompletedAt() != null;
        boolean hasMacro = macroTargetRepository.findByUserId(user.getId())
                .map(MacroTarget::getDailyCalories)
                .filter(c -> c != null && c.compareTo(BigDecimal.ZERO) > 0)
                .isPresent();
        boolean forceRedirect = !completed
                && user.getOnboardingSkippedAt() == null
                && user.getOnboardingStep() != null
                && user.getOnboardingStep() > 0;
        boolean showBanner = !completed && !forceRedirect;

        List<String> missing = new ArrayList<>();
        if (user.getHeightCm() == null) missing.add("heightCm");
        if (user.getGender() == null) missing.add("gender");
        if (!hasMacro) missing.add("macroTarget");

        int step = user.getOnboardingStep() != null ? user.getOnboardingStep() : 1;

        return OnboardingStatusDto.builder()
                .completed(completed)
                .forceRedirect(forceRedirect)
                .showBanner(showBanner)
                .step(step)
                .hasMacroTarget(hasMacro)
                .missingFields(missing)
                .build();
    }
}
