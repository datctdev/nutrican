package com.sba.nutricanbe.workspace.service;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.workspace.dto.BlindEstimateRequest;
import com.sba.nutricanbe.workspace.dto.ClientStatusDto;
import com.sba.nutricanbe.workspace.dto.DietLogReviewResponse;
import com.sba.nutricanbe.workspace.dto.ProgressDataDto;
import com.sba.nutricanbe.workspace.dto.PtClientAlertDto;
import com.sba.nutricanbe.workspace.dto.PtRblStatsDto;
import com.sba.nutricanbe.workspace.dto.PtStatsDto;
import com.sba.nutricanbe.workspace.dto.ReviewActionRequest;
import com.sba.nutricanbe.workspace.dto.MealPlanSuggestionDto;
import com.sba.nutricanbe.workspace.dto.MealPlanSuggestionReviewRequest;
import com.sba.nutricanbe.diet.dto.request.SelfPlanSubmissionReviewRequest;
import com.sba.nutricanbe.workspace.dto.WeeklySummaryDto;
import com.sba.nutricanbe.workspace.dto.WeeklySummaryRequest;
import com.sba.nutricanbe.workspace.dto.*;

import com.sba.nutricanbe.user.dto.MacroTargetRequest;
import com.sba.nutricanbe.user.dto.MacroTargetResponse;
import com.sba.nutricanbe.diet.dto.response.SosTicketResponse;
import com.sba.nutricanbe.diet.dto.response.SelfPlanSubmissionResponse;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface PtWorkspaceService {

    ApiResponse<PageResponse<ClientStatusDto>> getClients(UUID ptId, int page, int size, String statusFilter);

    ApiResponse<PageResponse<DietLogReviewResponse>> getPendingLogs(UUID ptId, int page, int size, UUID clientId);

    ApiResponse<PageResponse<DietLogReviewResponse>> getClientDietLogs(
            UUID ptId, UUID clientId, int page, int size, DietLogReviewStatus reviewStatus);

    ApiResponse<DietLogReviewResponse> reviewLog(UUID logId, UUID ptId, ReviewActionRequest request);

    ApiResponse<ProgressDataDto> getClientProgress(UUID ptId, UUID clientId, LocalDate startDate, LocalDate endDate);

    ApiResponse<ProgressDataDto> getClientProgress(
            UUID ptId, UUID clientId, LocalDate startDate, LocalDate endDate, LocalDate mealPlanWeekStart);

    ApiResponse<Void> assignClient(UUID ptId, UUID clientId);

    ApiResponse<PtStatsDto> getStats(UUID ptId);

    ApiResponse<List<SosTicketResponse>> getSosTickets(UUID ptId);

    ApiResponse<Void> resolveSosTicket(UUID ticketId, UUID ptId, String note);

    ApiResponse<DietLogReviewResponse> submitBlindEstimate(UUID logId, UUID ptId, BlindEstimateRequest request);

    ApiResponse<PtRblStatsDto> getRblStats(UUID ptId);

    ApiResponse<MacroTargetResponse> setClientMacroTarget(UUID ptId, UUID clientId, MacroTargetRequest request);

    ApiResponse<List<PtClientAlertDto>> getClientAlerts(UUID ptId);

    ApiResponse<MealPlanSuggestionDto> reviewMealPlanSuggestion(UUID ptId, UUID suggestionId, MealPlanSuggestionReviewRequest request);

    ApiResponse<WeeklySummaryDto> createWeeklySummary(UUID ptId, WeeklySummaryRequest request);

    ApiResponse<List<MealPlanSuggestionDto>> getPendingMealPlanSuggestions(UUID ptId, UUID clientId);

    ApiResponse<com.sba.nutricanbe.chat.dto.ChatContextSummaryDto> getChatContext(UUID ptId, UUID clientId);

    ApiResponse<PtClientProfileDto> getClientProfile(UUID ptId, UUID clientId);

    ApiResponse<PtClientProfileDto> updateClientProfile(UUID ptId, UUID clientId, PtClientProfileDto request);

    ApiResponse<PtClientProfileDto> createClient(UUID ptId, CreateClientRequest request);

    ApiResponse<TemplateResponse> saveAsTemplate(UUID ptId, CreateTemplateRequest request);

    ApiResponse<List<TemplateResponse>> getTemplatesByPt(UUID ptId);

    ApiResponse<Void> applyTemplateToClient(UUID ptId, UUID templateId, UUID clientId, ApplyTemplateRequest request);

    ApiResponse<List<SelfPlanSubmissionResponse>> listPendingSelfPlanSubmissions(UUID ptId);

    ApiResponse<SelfPlanSubmissionResponse> reviewSelfPlanSubmission(
            UUID ptId, UUID submissionId, SelfPlanSubmissionReviewRequest request);

    ApiResponse<com.sba.nutricanbe.diet.dto.response.DayPlanResponse> getClientDayPlan(
            UUID ptId, UUID clientId, LocalDate date);

    ApiResponse<com.sba.nutricanbe.diet.dto.response.DietSummaryResponse> getClientDietSummary(
            UUID ptId, UUID clientId, LocalDate date);

    ApiResponse<com.sba.nutricanbe.diet.dto.response.DayTimelineResponse> getClientDayTimeline(
            UUID ptId, UUID clientId, LocalDate date);
}
