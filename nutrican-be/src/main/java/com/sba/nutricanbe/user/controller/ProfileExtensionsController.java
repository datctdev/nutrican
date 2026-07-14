package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.common.util.MacroSuggestionCalculator;
import com.sba.nutricanbe.diet.enums.AllergenType;
import com.sba.nutricanbe.user.dto.AllergyProfileRequest;
import com.sba.nutricanbe.user.dto.BodyMetricDto;
import com.sba.nutricanbe.user.dto.BodyMetricReminderStatusDto;
import com.sba.nutricanbe.user.dto.BodyMetricRequest;
import com.sba.nutricanbe.user.dto.ClientGoalDto;
import com.sba.nutricanbe.user.dto.ClientGoalRequest;
import com.sba.nutricanbe.user.entity.BodyMetric;
import com.sba.nutricanbe.user.service.BodyMetricService;
import com.sba.nutricanbe.user.service.ClientGoalService;
import com.sba.nutricanbe.workspace.dto.MilestoneDto;
import com.sba.nutricanbe.user.dto.OnboardingRequest;
import com.sba.nutricanbe.user.dto.OnboardingStatusDto;
import com.sba.nutricanbe.user.dto.MacroSuggestionResponse;
import com.sba.nutricanbe.user.dto.UserPreferencesRequest;
import com.sba.nutricanbe.user.dto.InbodyAnalysisResponse;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.NutritionGoal;
import com.sba.nutricanbe.user.repository.BodyMetricRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class ProfileExtensionsController {

    private final UserRepository userRepository;
    private final ClientGoalService clientGoalService;
    private final BodyMetricService bodyMetricService;
    private final BodyMetricRepository bodyMetricRepository;
    private final com.sba.nutricanbe.user.service.OnboardingService onboardingService;
    private final com.sba.nutricanbe.user.service.CoachingLifecycleService coachingLifecycleService;

    @GetMapping("/allergies")
    public ResponseEntity<ApiResponse<List<AllergenType>>> getAllergies(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(user.getAllergens() != null ? user.getAllergens() : List.of()));
    }

    @PutMapping("/allergies")
    public ResponseEntity<ApiResponse<List<AllergenType>>> updateAllergies(
            @AuthenticationPrincipal User user,
            @RequestBody AllergyProfileRequest request) {
        user.setAllergens(request.getAllergens());
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(user.getAllergens(), "Allergies updated"));
    }

    @PutMapping("/preferences")
    public ResponseEntity<ApiResponse<Void>> updatePreferences(
            @AuthenticationPrincipal User user,
            @RequestBody UserPreferencesRequest request) {
        if (request.getDietPreference() != null) user.setDietPreference(request.getDietPreference());
        if (request.getNutritionGoal() != null) user.setNutritionGoal(request.getNutritionGoal());
        if (request.getPregnancyTrimester() != null) user.setPregnancyTrimester(request.getPregnancyTrimester());
        if (request.getNotificationOptIn() != null) user.setNotificationOptIn(request.getNotificationOptIn());
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(null, "Preferences updated"));
    }

    @GetMapping("/macro-suggestion")
    public ResponseEntity<ApiResponse<MacroSuggestionResponse>> macroSuggestion(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) BigDecimal weightKg,
            @RequestParam(required = false) BigDecimal heightCm,
            @RequestParam(required = false) Integer age,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) BigDecimal activityFactor,
            @RequestParam(required = false) NutritionGoal nutritionGoal,
            @RequestParam(required = false) Integer pregnancyTrimester) {
        BigDecimal resolvedWeight = weightKg;
        if (resolvedWeight == null) {
            resolvedWeight = bodyMetricRepository.findTopByUserIdOrderByRecordDateDesc(user.getId())
                    .map(BodyMetric::getWeight)
                    .orElse(null);
        }
        Integer resolvedHeight = user.getHeightCm();
        if (heightCm != null) {
            resolvedHeight = heightCm.intValue();
        }
        String resolvedGender = gender != null ? gender : user.getGender();
        MacroSuggestionResponse suggestion = MacroSuggestionCalculator.calculate(
                user,
                resolvedWeight,
                resolvedHeight != null ? BigDecimal.valueOf(resolvedHeight) : null,
                age,
                resolvedGender,
                activityFactor != null ? activityFactor : BigDecimal.valueOf(1.55),
                nutritionGoal,
                pregnancyTrimester);
        return ResponseEntity.ok(ApiResponse.success(suggestion));
    }

    @GetMapping("/goals")
    public ResponseEntity<ApiResponse<ClientGoalDto>> getGoals(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(clientGoalService.getGoals(user.getId())));
    }

    @PutMapping("/goals")
    public ResponseEntity<ApiResponse<ClientGoalDto>> saveGoals(
            @AuthenticationPrincipal User user,
            @RequestBody ClientGoalRequest request) {
        return ResponseEntity.ok(ApiResponse.success(clientGoalService.saveGoals(user.getId(), request), "Goals saved"));
    }

    @GetMapping("/milestones")
    public ResponseEntity<ApiResponse<List<MilestoneDto>>> getMilestones(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(clientGoalService.listMilestones(user.getId())));
    }

    @GetMapping("/body-metrics")
    public ResponseEntity<ApiResponse<PageResponse<BodyMetricDto>>> listBodyMetrics(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = bodyMetricService.listMetrics(user.getId(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "recordDate")));
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(result)));
    }

    @PostMapping("/body-metrics")
    public ResponseEntity<ApiResponse<BodyMetricDto>> recordBodyMetric(
            @AuthenticationPrincipal User user,
            @RequestBody BodyMetricRequest request) {
        BodyMetric saved = bodyMetricService.recordMetric(user.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(
                BodyMetricDto.from(saved), "Body metric recorded"));
    }

    @PostMapping(value = "/body-metrics/analyze-inbody", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<InbodyAnalysisResponse>> analyzeInbody(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file) {
        InbodyAnalysisResponse result = bodyMetricService.analyzeInbody(file);
        return ResponseEntity.ok(ApiResponse.success(result, "Inbody sheet analyzed successfully"));
    }

    @GetMapping("/body-metric-reminder-status")
    public ResponseEntity<ApiResponse<BodyMetricReminderStatusDto>> bodyMetricReminderStatus(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(bodyMetricService.getReminderStatus(user.getId())));
    }

    @GetMapping("/onboarding-status")
    public ResponseEntity<ApiResponse<OnboardingStatusDto>> onboardingStatus(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(onboardingService.getStatus(user.getId())));
    }

    @PostMapping("/onboarding")
    public ResponseEntity<ApiResponse<OnboardingStatusDto>> submitOnboarding(
            @AuthenticationPrincipal User user,
            @RequestBody OnboardingRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                onboardingService.submitStep(user.getId(), request), "Onboarding updated"));
    }

    @PostMapping("/onboarding/skip")
    public ResponseEntity<ApiResponse<OnboardingStatusDto>> skipOnboarding(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(onboardingService.skip(user.getId()), "Onboarding skipped"));
    }

    @GetMapping("/coaching-history")
    public ResponseEntity<ApiResponse<List<com.sba.nutricanbe.user.dto.CoachingHistoryDto>>> coachingHistory(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(coachingLifecycleService.getCoachingHistory(user.getId())));
    }

    @PostMapping("/end-coaching")
    public ResponseEntity<ApiResponse<com.sba.nutricanbe.user.dto.PtClientMappingResponse>> requestEndCoaching(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(
                coachingLifecycleService.requestEndCoaching(user.getId(), user.getId(), false)));
    }

    @PutMapping("/end-coaching/confirm")
    public ResponseEntity<ApiResponse<com.sba.nutricanbe.user.dto.PtClientMappingResponse>> confirmEndCoaching(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(
                coachingLifecycleService.confirmEndCoaching(user.getId(), user.getId(), false)));
    }

    @PutMapping("/pt/max-clients")
    public ResponseEntity<ApiResponse<Void>> setMaxClients(
            @AuthenticationPrincipal User user,
            @RequestBody java.util.Map<String, Integer> body) {
        Integer max = body != null ? body.get("maxClients") : null;
        if (max == null) {
            throw new com.sba.nutricanbe.common.exception.BadRequestException("maxClients is required");
        }
        coachingLifecycleService.setMaxClients(user.getId(), max);
        return ResponseEntity.ok(ApiResponse.success(null, "maxClients updated"));
    }
}
