package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.user.dto.AllergyProfileRequest;
import com.sba.nutricanbe.user.dto.BodyMetricDto;
import com.sba.nutricanbe.user.dto.BodyMetricReminderStatusDto;
import com.sba.nutricanbe.user.dto.BodyMetricRequest;
import com.sba.nutricanbe.user.dto.ClientGoalDto;
import com.sba.nutricanbe.user.dto.ClientGoalRequest;
import com.sba.nutricanbe.user.dto.CoachingHistoryDto;
import com.sba.nutricanbe.user.dto.InbodyAnalysisResponse;
import com.sba.nutricanbe.user.dto.MacroSuggestionQuery;
import com.sba.nutricanbe.user.dto.MacroSuggestionResponse;
import com.sba.nutricanbe.user.dto.OnboardingRequest;
import com.sba.nutricanbe.user.dto.OnboardingStatusDto;
import com.sba.nutricanbe.user.dto.PtClientMappingResponse;
import com.sba.nutricanbe.user.dto.RecalculateMacrosRequest;
import com.sba.nutricanbe.user.dto.RecalculateMacrosResponse;
import com.sba.nutricanbe.user.dto.UserPreferencesRequest;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ActivityLevel;
import com.sba.nutricanbe.user.enums.NutritionGoal;
import com.sba.nutricanbe.user.service.BodyMetricService;
import com.sba.nutricanbe.user.service.ClientGoalService;
import com.sba.nutricanbe.user.service.CoachingLifecycleService;
import com.sba.nutricanbe.user.service.OnboardingService;
import com.sba.nutricanbe.user.service.ProfileExtensionsService;
import com.sba.nutricanbe.workspace.dto.MilestoneDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class ProfileExtensionsController {

    private final ClientGoalService clientGoalService;
    private final BodyMetricService bodyMetricService;
    private final OnboardingService onboardingService;
    private final CoachingLifecycleService coachingLifecycleService;
    private final ProfileExtensionsService profileExtensionsService;

    @GetMapping("/allergies")
    public ResponseEntity<ApiResponse<String>> getAllergies(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(
                profileExtensionsService.getAllergies(user.getId()), "Allergies fetched"));
    }

    @PutMapping("/allergies")
    public ResponseEntity<ApiResponse<String>> updateAllergies(
            @AuthenticationPrincipal User user,
            @RequestBody AllergyProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                profileExtensionsService.updateAllergies(user.getId(), request), "Allergies updated"));
    }

    @PutMapping("/preferences")
    public ResponseEntity<ApiResponse<Void>> updatePreferences(
            @AuthenticationPrincipal User user,
            @RequestBody UserPreferencesRequest request) {
        profileExtensionsService.updatePreferences(user.getId(), request);
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
            @RequestParam(required = false) ActivityLevel activityLevel,
            @RequestParam(required = false) Integer sessionsPerWeek,
            @RequestParam(required = false) Integer minutesPerSession,
            @RequestParam(required = false) NutritionGoal nutritionGoal,
            @RequestParam(required = false) Integer pregnancyTrimester) {
        MacroSuggestionQuery query = new MacroSuggestionQuery(
                weightKg, heightCm, age, gender, activityFactor,
                activityLevel, sessionsPerWeek, minutesPerSession, nutritionGoal, pregnancyTrimester);
        return ResponseEntity.ok(ApiResponse.success(
                profileExtensionsService.suggestMacros(user.getId(), query)));
    }

    @PostMapping("/recalculate-macros")
    public ResponseEntity<ApiResponse<RecalculateMacrosResponse>> recalculateMacros(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody RecalculateMacrosRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                profileExtensionsService.recalculateMacros(user.getId(), request), "Macros recalculated"));
    }

    @GetMapping("/goals")
    public ResponseEntity<ApiResponse<ClientGoalDto>> getGoals(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(clientGoalService.getGoals(user.getId())));
    }

    @PutMapping("/goals")
    public ResponseEntity<ApiResponse<ClientGoalDto>> saveGoals(
            @AuthenticationPrincipal User user,
            @RequestBody ClientGoalRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                clientGoalService.saveGoalsForSelf(user.getId(), request), "Goals saved"));
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
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(bodyMetricService.listMetrics(user.getId(), page, size))));
    }

    @PostMapping("/body-metrics")
    public ResponseEntity<ApiResponse<BodyMetricDto>> recordBodyMetric(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody BodyMetricRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                bodyMetricService.recordMetricDto(user.getId(), request), "Body metric recorded"));
    }

    @PostMapping(value = "/body-metrics/analyze-inbody", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<InbodyAnalysisResponse>> analyzeInbody(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success(
                bodyMetricService.analyzeInbody(file), "Inbody sheet analyzed successfully"));
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

    @GetMapping("/has-active-pt")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> hasActivePt(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("hasActivePt", profileExtensionsService.hasActivePt(user.getId()))));
    }

    @GetMapping("/coaching-history")
    public ResponseEntity<ApiResponse<List<CoachingHistoryDto>>> coachingHistory(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(coachingLifecycleService.getCoachingHistory(user.getId())));
    }

    @PostMapping("/end-coaching")
    public ResponseEntity<ApiResponse<PtClientMappingResponse>> requestEndCoaching(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(
                coachingLifecycleService.requestEndCoaching(user.getId(), user.getId(), false)));
    }

    @PutMapping("/end-coaching/confirm")
    public ResponseEntity<ApiResponse<PtClientMappingResponse>> confirmEndCoaching(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(
                coachingLifecycleService.confirmEndCoaching(user.getId(), user.getId(), false)));
    }

    @PutMapping("/pt/max-clients")
    public ResponseEntity<ApiResponse<Void>> setMaxClients(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Integer> body) {
        coachingLifecycleService.setMaxClients(user.getId(), body != null ? body.get("maxClients") : null);
        return ResponseEntity.ok(ApiResponse.success(null, "maxClients updated"));
    }
}
