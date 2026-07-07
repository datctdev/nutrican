package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.user.dto.OnboardingRequest;
import com.sba.nutricanbe.user.dto.OnboardingStatusDto;

import java.util.UUID;

public interface OnboardingService {
    OnboardingStatusDto getStatus(UUID userId);

    OnboardingStatusDto submitStep(UUID userId, OnboardingRequest request);

    OnboardingStatusDto skip(UUID userId);
}
