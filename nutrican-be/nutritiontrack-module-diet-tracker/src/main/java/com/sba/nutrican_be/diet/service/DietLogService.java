package com.sba.nutrican_be.diet.service;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.diet.dto.AnalyzeMealResponse;
import com.sba.nutrican_be.diet.dto.CreateDietLogRequest;
import com.sba.nutrican_be.diet.dto.CreateSosRequest;
import com.sba.nutrican_be.diet.dto.DietLogResponse;
import com.sba.nutrican_be.diet.dto.DietSummaryResponse;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.UUID;

public interface DietLogService {

    ApiResponse<DietLogResponse> createLog(UUID customerId, CreateDietLogRequest request);

    ApiResponse<AnalyzeMealResponse> analyzeMeal(UUID customerId, MultipartFile file, String mealType);

    ApiResponse<PageResponse<DietLogResponse>> getLogs(UUID customerId, int page, int size,
                                                        LocalDate startDate, LocalDate endDate, String status);

    ApiResponse<DietLogResponse> getLogById(UUID logId);

    ApiResponse<DietLogResponse> updateLog(UUID logId, UUID userId, CreateDietLogRequest request);

    ApiResponse<Void> deleteLog(UUID logId, UUID userId);

    ApiResponse<DietSummaryResponse> getSummary(UUID customerId, LocalDate date);

    ApiResponse<Void> createSosTicket(UUID customerId, CreateSosRequest request);
}
