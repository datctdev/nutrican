package com.sba.nutrican_be.workspace.service;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.workspace.dto.BlindEstimateRequest;
import com.sba.nutrican_be.workspace.dto.ClientStatusDto;
import com.sba.nutrican_be.workspace.dto.DietLogReviewResponse;
import com.sba.nutrican_be.workspace.dto.ProgressDataDto;
import com.sba.nutrican_be.workspace.dto.PtRblStatsDto;
import com.sba.nutrican_be.workspace.dto.PtStatsDto;
import com.sba.nutrican_be.workspace.dto.ReviewActionRequest;

import com.sba.nutrican_be.core.dto.SosTicketResponse;

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
