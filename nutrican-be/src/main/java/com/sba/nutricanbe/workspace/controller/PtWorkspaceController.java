package com.sba.nutricanbe.workspace.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.user.dto.BodyMetricDto;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.dto.PtClientMappingResponse;
import com.sba.nutricanbe.user.service.MarketplaceService;
import com.sba.nutricanbe.user.service.ClientGoalService;
import com.sba.nutricanbe.workspace.dto.*;
import com.sba.nutricanbe.workspace.service.PtWorkspaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workspace")
@PreAuthorize("hasAnyRole('PT_CERTIFIED', 'PT_FREELANCE')")
@RequiredArgsConstructor
public class PtWorkspaceController {

    private final PtWorkspaceService ptWorkspaceService;
    private final MarketplaceService marketplaceService;
    private final ClientGoalService clientGoalService;
    private final com.sba.nutricanbe.user.service.BodyMetricService bodyMetricService;
    private final com.sba.nutricanbe.user.service.CoachingLifecycleService coachingLifecycleService;

    @GetMapping("/clients")
    public ResponseEntity<ApiResponse<PageResponse<ClientStatusDto>>> getClients(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ptWorkspaceService.getClients(user.getId(), page, size, status));
    }

    @GetMapping("/diet-logs/pending")
    public ResponseEntity<ApiResponse<PageResponse<DietLogReviewResponse>>> getPendingLogs(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) UUID clientId) {
        return ResponseEntity.ok(ptWorkspaceService.getPendingLogs(user.getId(), page, size, clientId));
    }

    @PutMapping("/diet-logs/{id}/review")
    public ResponseEntity<ApiResponse<DietLogReviewResponse>> reviewLog(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user,
            @RequestBody ReviewActionRequest request) {
        return ResponseEntity.ok(ptWorkspaceService.reviewLog(id, user.getId(), request));
    }

    @GetMapping("/progress/{clientId}")
    public ResponseEntity<ApiResponse<ProgressDataDto>> getClientProgress(
            @PathVariable UUID clientId,
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate mealPlanWeekStart) {
        return ResponseEntity.ok(ptWorkspaceService.getClientProgress(
                user.getId(), clientId, startDate, endDate, mealPlanWeekStart));
    }

    @GetMapping("/clients/{clientId}/body-metrics")
    public ResponseEntity<ApiResponse<PageResponse<BodyMetricDto>>> getClientBodyMetrics(
            @PathVariable UUID clientId,
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = bodyMetricService.listMetricsForClient(user.getId(), clientId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "recordDate")));
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(result)));
    }

    @PostMapping("/clients/{clientId}/assign")
    public ResponseEntity<ApiResponse<Void>> assignClient(
            @PathVariable UUID clientId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ptWorkspaceService.assignClient(user.getId(), clientId));
    }

    @PutMapping("/clients/{clientId}/hire-request")
    public ResponseEntity<ApiResponse<PtClientMappingResponse>> updateHireRequest(
            @PathVariable UUID clientId,
            @AuthenticationPrincipal User user,
            @RequestParam String action) {
        return ResponseEntity.ok(marketplaceService.updateHireRequest(clientId, user.getId(), action));
    }

    @GetMapping("/alerts")
    public ResponseEntity<ApiResponse<java.util.List<PtClientAlertDto>>> getAlerts(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ptWorkspaceService.getClientAlerts(user.getId()));
    }

    @PostMapping("/clients/{clientId}/milestones")
    public ResponseEntity<ApiResponse<MilestoneDto>> addClientMilestone(
            @PathVariable UUID clientId,
            @AuthenticationPrincipal User user,
            @RequestBody java.util.Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.success(
                clientGoalService.addManualMilestone(clientId, body.get("title"), body.get("note")),
                "Milestone added"));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<PtStatsDto>> getStats(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ptWorkspaceService.getStats(user.getId()));
    }

    @GetMapping("/sos")
    public ResponseEntity<ApiResponse<java.util.List<com.sba.nutricanbe.diet.dto.response.SosTicketResponse>>> getSosTickets(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ptWorkspaceService.getSosTickets(user.getId()));
    }

    @PutMapping("/sos/{ticketId}/resolve")
    public ResponseEntity<ApiResponse<Void>> resolveSosTicket(
            @PathVariable UUID ticketId,
            @AuthenticationPrincipal User user,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String note = body != null ? body.get("resolutionNote") : null;
        if (note == null && body != null) note = body.get("note");
        return ResponseEntity.ok(ptWorkspaceService.resolveSosTicket(ticketId, user.getId(), note));
    }

    @PutMapping("/diet-logs/{id}/blind-estimate")
    public ResponseEntity<ApiResponse<DietLogReviewResponse>> submitBlindEstimate(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user,
            @RequestBody BlindEstimateRequest request) {
        return ResponseEntity.ok(ptWorkspaceService.submitBlindEstimate(id, user.getId(), request));
    }

    @GetMapping("/rbl/stats")
    public ResponseEntity<ApiResponse<PtRblStatsDto>> getRblStats(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ptWorkspaceService.getRblStats(user.getId()));
    }

    @PutMapping("/clients/{clientId}/macro-target")
    public ResponseEntity<ApiResponse<com.sba.nutricanbe.user.dto.MacroTargetResponse>> setClientMacroTarget(
            @PathVariable UUID clientId,
            @AuthenticationPrincipal User user,
            @RequestBody com.sba.nutricanbe.user.dto.MacroTargetRequest request) {
        return ResponseEntity.ok(ptWorkspaceService.setClientMacroTarget(user.getId(), clientId, request));
    }

    @PutMapping("/meal-plan-suggestions/{id}")
    public ResponseEntity<ApiResponse<MealPlanSuggestionDto>> reviewMealPlanSuggestion(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user,
            @RequestBody MealPlanSuggestionReviewRequest request) {
        return ResponseEntity.ok(ptWorkspaceService.reviewMealPlanSuggestion(user.getId(), id, request));
    }

    @GetMapping("/clients/{clientId}/meal-plan-suggestions")
    public ResponseEntity<ApiResponse<java.util.List<MealPlanSuggestionDto>>> getPendingSuggestions(
            @PathVariable UUID clientId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ptWorkspaceService.getPendingMealPlanSuggestions(user.getId(), clientId));
    }

    @GetMapping("/self-plan-submissions")
    public ResponseEntity<ApiResponse<java.util.List<com.sba.nutricanbe.diet.dto.response.SelfPlanSubmissionResponse>>> listSelfPlanSubmissions(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ptWorkspaceService.listPendingSelfPlanSubmissions(user.getId()));
    }

    @PutMapping("/self-plan-submissions/{id}")
    public ResponseEntity<ApiResponse<com.sba.nutricanbe.diet.dto.response.SelfPlanSubmissionResponse>> reviewSelfPlanSubmission(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user,
            @RequestBody com.sba.nutricanbe.diet.dto.request.SelfPlanSubmissionReviewRequest request) {
        return ResponseEntity.ok(ptWorkspaceService.reviewSelfPlanSubmission(user.getId(), id, request));
    }

    @PostMapping("/weekly-summary")
    public ResponseEntity<ApiResponse<WeeklySummaryDto>> createWeeklySummary(
            @AuthenticationPrincipal User user,
            @RequestBody WeeklySummaryRequest request) {
        return ResponseEntity.ok(ptWorkspaceService.createWeeklySummary(user.getId(), request));
    }

    @PostMapping("/clients/{clientId}/end-coaching")
    public ResponseEntity<ApiResponse<PtClientMappingResponse>> requestEndCoaching(
            @PathVariable UUID clientId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(
                coachingLifecycleService.requestEndCoaching(user.getId(), clientId, true)));
    }

    @PutMapping("/clients/{clientId}/end-coaching/confirm")
    public ResponseEntity<ApiResponse<PtClientMappingResponse>> confirmEndCoaching(
            @PathVariable UUID clientId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(
                coachingLifecycleService.confirmEndCoaching(user.getId(), clientId, true)));
    }

    @GetMapping("/clients/{clientId}/profile")
    public ResponseEntity<ApiResponse<PtClientProfileDto>> getClientProfile(
            @PathVariable UUID clientId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ptWorkspaceService.getClientProfile(user.getId(), clientId));
    }

    @PutMapping("/clients/{clientId}/profile")
    public ResponseEntity<ApiResponse<PtClientProfileDto>> updateClientProfile(
            @PathVariable UUID clientId,
            @AuthenticationPrincipal User user,
            @RequestBody PtClientProfileDto request) {
        return ResponseEntity.ok(ptWorkspaceService.updateClientProfile(user.getId(), clientId, request));
    }

    @PostMapping("/clients")
    public ResponseEntity<ApiResponse<PtClientProfileDto>> createClient(
            @AuthenticationPrincipal User user,
            @RequestBody CreateClientRequest request) {
        return ResponseEntity.ok(ptWorkspaceService.createClient(user.getId(), request));
    }

    @GetMapping("/clients/{clientId}/chat-context")
    public ResponseEntity<ApiResponse<com.sba.nutricanbe.chat.dto.ChatContextSummaryDto>> getChatContext(
            @PathVariable UUID clientId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ptWorkspaceService.getChatContext(user.getId(), clientId));
    }

    @PostMapping("/templates")
    public ResponseEntity<ApiResponse<TemplateResponse>> saveAsTemplate(
            @AuthenticationPrincipal User user,
            @RequestBody CreateTemplateRequest request) {
        return ResponseEntity.ok(ptWorkspaceService.saveAsTemplate(user.getId(), request));
    }

    @GetMapping("/templates")
    public ResponseEntity<ApiResponse<java.util.List<TemplateResponse>>> getTemplates(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ptWorkspaceService.getTemplatesByPt(user.getId()));
    }

    @PostMapping("/clients/{clientId}/apply-template/{templateId}")
    public ResponseEntity<ApiResponse<Void>> applyTemplateToClient(
            @PathVariable UUID clientId,
            @PathVariable UUID templateId,
            @AuthenticationPrincipal User user,
            @RequestBody ApplyTemplateRequest request) {
        return ResponseEntity.ok(ptWorkspaceService.applyTemplateToClient(user.getId(), templateId, clientId, request));
    }

    @GetMapping("/clients/{clientId}/day-plan")
    public ResponseEntity<ApiResponse<com.sba.nutricanbe.diet.dto.response.DayPlanResponse>> getClientDayPlan(
            @AuthenticationPrincipal User user,
            @PathVariable UUID clientId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ptWorkspaceService.getClientDayPlan(user.getId(), clientId, date));
    }

    @GetMapping("/clients/{clientId}/diet-summary")
    public ResponseEntity<ApiResponse<com.sba.nutricanbe.diet.dto.response.DietSummaryResponse>> getClientDietSummary(
            @AuthenticationPrincipal User user,
            @PathVariable UUID clientId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ptWorkspaceService.getClientDietSummary(user.getId(), clientId, date));
    }
}
