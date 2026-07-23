package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.util.MacroSuggestionCalculator;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.user.dto.AllergyProfileRequest;
import com.sba.nutricanbe.user.dto.MacroSuggestionQuery;
import com.sba.nutricanbe.user.dto.MacroSuggestionResponse;
import com.sba.nutricanbe.user.dto.MacroTargetRequest;
import com.sba.nutricanbe.user.dto.RecalculateMacrosRequest;
import com.sba.nutricanbe.user.dto.RecalculateMacrosResponse;
import com.sba.nutricanbe.user.dto.UserPreferencesRequest;
import com.sba.nutricanbe.user.entity.BodyMetric;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.repository.BodyMetricRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.ProfileExtensionsService;
import com.sba.nutricanbe.user.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProfileExtensionsServiceImpl implements ProfileExtensionsService {

    private final UserRepository userRepository;
    private final BodyMetricRepository bodyMetricRepository;
    private final DietLogHelper dietLogHelper;
    private final UserProfileService userProfileService;

    @Override
    @Transactional(readOnly = true)
    public String getAllergies(UUID userId) {
        User user = loadUser(userId);
        return user.getAllergyNotes() != null ? user.getAllergyNotes() : "";
    }

    @Override
    @Transactional
    public String updateAllergies(UUID userId, AllergyProfileRequest request) {
        User user = loadUser(userId);
        user.setAllergyNotes(request.getAllergyNotes());
        userRepository.save(user);
        return request.getAllergyNotes();
    }

    @Override
    @Transactional
    public void updatePreferences(UUID userId, UserPreferencesRequest request) {
        User user = loadUser(userId);
        boolean coached = dietLogHelper.hasActivePt(userId);
        if (request.getDietPreference() != null) {
            user.setDietPreference(request.getDietPreference());
        }
        if (request.getNutritionGoal() != null) {
            if (coached) {
                throw new BadRequestException(
                        "Mục tiêu dinh dưỡng đang do PT quản lý — liên hệ PT để thay đổi");
            }
            user.setNutritionGoal(request.getNutritionGoal());
        }
        if (request.getActivityLevel() != null) {
            if (coached) {
                throw new BadRequestException(
                        "Mức vận động đang do PT quản lý — liên hệ PT để thay đổi");
            }
            user.setActivityLevel(request.getActivityLevel());
        }
        if (request.getPregnancyTrimester() != null) {
            if (coached) {
                throw new BadRequestException(
                        "Thông tin thai kỳ coaching đang do PT quản lý — liên hệ PT để thay đổi");
            }
            user.setPregnancyTrimester(request.getPregnancyTrimester());
        }
        if (request.getNotificationOptIn() != null) {
            user.setNotificationOptIn(request.getNotificationOptIn());
        }
        userRepository.save(user);
    }

    @Override
    @Transactional(readOnly = true)
    public MacroSuggestionResponse suggestMacros(UUID userId, MacroSuggestionQuery query) {
        User user = loadUser(userId);
        BigDecimal resolvedWeight = query.weightKg();
        if (resolvedWeight == null) {
            resolvedWeight = latestWeight(userId);
        }
        Integer resolvedHeight = user.getHeightCm();
        if (query.heightCm() != null) {
            resolvedHeight = query.heightCm().intValue();
        }
        String resolvedGender = query.gender() != null ? query.gender() : user.getGender();
        BigDecimal factor = MacroSuggestionCalculator.resolveFactor(
                query.activityLevel() != null ? query.activityLevel() : user.getActivityLevel(),
                query.activityFactor());
        return MacroSuggestionCalculator.calculate(
                user,
                resolvedWeight,
                resolvedHeight != null ? BigDecimal.valueOf(resolvedHeight) : null,
                query.age(),
                resolvedGender,
                factor,
                query.nutritionGoal(),
                query.pregnancyTrimester());
    }

    @Override
    @Transactional
    public RecalculateMacrosResponse recalculateMacros(UUID userId, RecalculateMacrosRequest request) {
        if (request.getActivityLevel() == null) {
            throw new BadRequestException("activityLevel is required");
        }
        if (dietLogHelper.hasActivePt(userId)) {
            throw new BadRequestException(
                    "Mục tiêu dinh dưỡng đang do PT quản lý — liên hệ PT để thay đổi macro");
        }
        User user = loadUser(userId);
        user.setActivityLevel(request.getActivityLevel());
        if (request.getNutritionGoal() != null) {
            user.setNutritionGoal(request.getNutritionGoal());
        }
        if (request.getPregnancyTrimester() != null) {
            user.setPregnancyTrimester(request.getPregnancyTrimester());
        }
        userRepository.save(user);

        BigDecimal weight = latestWeight(user.getId());
        Integer height = user.getHeightCm();
        MacroSuggestionResponse suggestion = MacroSuggestionCalculator.calculate(
                user,
                weight,
                height != null ? BigDecimal.valueOf(height) : null,
                null,
                user.getGender(),
                request.getActivityLevel().toFactor(),
                request.getNutritionGoal() != null ? request.getNutritionGoal() : user.getNutritionGoal(),
                request.getPregnancyTrimester() != null
                        ? request.getPregnancyTrimester() : user.getPregnancyTrimester());

        MacroTargetRequest macroReq = new MacroTargetRequest();
        macroReq.setDailyCalories(suggestion.getDailyCalories());
        macroReq.setProtein(suggestion.getProtein());
        macroReq.setCarb(suggestion.getCarb());
        macroReq.setFat(suggestion.getFat());
        userProfileService.setMacroTarget(user.getId(), macroReq);

        return RecalculateMacrosResponse.builder()
                .activityLevel(user.getActivityLevel())
                .macros(suggestion)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasActivePt(UUID userId) {
        return dietLogHelper.hasActivePt(userId);
    }

    private User loadUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
    }

    private BigDecimal latestWeight(UUID userId) {
        return bodyMetricRepository.findTopByUserIdOrderByRecordDateDesc(userId)
                .map(BodyMetric::getWeight)
                .orElse(null);
    }
}
