package com.sba.nutrican_be.diet.service;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.diet.dto.CreateDietLogRequest;
import com.sba.nutrican_be.diet.dto.DietLogResponse;
import com.sba.nutrican_be.diet.dto.DietSummaryResponse;

import java.time.LocalDate;
import java.util.UUID;

public interface DietLogService {

    ApiResponse<DietLogResponse> createLog(UUID customerId, CreateDietLogRequest request);

    ApiResponse<PageResponse<DietLogResponse>> getLogs(UUID customerId, int page, int size,
                                                        LocalDate startDate, LocalDate endDate, String status);

    ApiResponse<DietLogResponse> getLogById(UUID logId, UUID customerId);

    ApiResponse<DietLogResponse> updateLog(UUID logId, UUID userId, CreateDietLogRequest request);

    ApiResponse<Void> deleteLog(UUID logId, UUID userId);

    ApiResponse<DietSummaryResponse> getSummary(UUID customerId, LocalDate date);

    ApiResponse<DietLogResponse> submitForReview(UUID logId, UUID customerId);
}
