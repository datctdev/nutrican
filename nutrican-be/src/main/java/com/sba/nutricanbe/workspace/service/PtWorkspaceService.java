package com.sba.nutricanbe.workspace.service;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.workspace.dto.BlindEstimateRequest;
import com.sba.nutricanbe.workspace.dto.ClientStatusDto;
import com.sba.nutricanbe.workspace.dto.DietLogReviewResponse;
import com.sba.nutricanbe.workspace.dto.ProgressDataDto;
import com.sba.nutricanbe.workspace.dto.PtRblStatsDto;
import com.sba.nutricanbe.workspace.dto.PtStatsDto;
import com.sba.nutricanbe.workspace.dto.ReviewActionRequest;

import com.sba.nutricanbe.diet.dto.SosTicketResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface PtWorkspaceService {

    ApiResponse<PageResponse<ClientStatusDto>> getClients(UUID ptId, int page, int size, String statusFilter);

    ApiResponse<PageResponse<DietLogReviewResponse>> getPendingLogs(UUID ptId, int page, int size);

    ApiResponse<DietLogReviewResponse> reviewLog(UUID logId, UUID ptId, ReviewActionRequest request);

    ApiResponse<ProgressDataDto> getClientProgress(UUID ptId, UUID clientId, LocalDate startDate, LocalDate endDate);

    ApiResponse<Void> assignClient(UUID ptId, UUID clientId);

    ApiResponse<PtStatsDto> getStats(UUID ptId);

    ApiResponse<List<SosTicketResponse>> getSosTickets(UUID ptId);

    ApiResponse<Void> resolveSosTicket(UUID ticketId, UUID ptId, String note);

    ApiResponse<DietLogReviewResponse> submitBlindEstimate(UUID logId, UUID ptId, BlindEstimateRequest request);

    ApiResponse<PtRblStatsDto> getRblStats(UUID ptId);
}
