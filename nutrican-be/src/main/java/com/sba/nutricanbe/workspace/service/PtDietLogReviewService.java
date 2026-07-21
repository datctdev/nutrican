package com.sba.nutricanbe.workspace.service;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.workspace.dto.BlindEstimateRequest;
import com.sba.nutricanbe.workspace.dto.DietLogReviewResponse;
import com.sba.nutricanbe.workspace.dto.ReviewActionRequest;

import java.util.UUID;

public interface PtDietLogReviewService {

    ApiResponse<PageResponse<DietLogReviewResponse>> getPendingLogs(UUID ptId, int page, int size, UUID clientId);

    ApiResponse<PageResponse<DietLogReviewResponse>> getClientDietLogs(
            UUID ptId, UUID clientId, int page, int size, DietLogReviewStatus reviewStatus);

    ApiResponse<DietLogReviewResponse> reviewLog(UUID logId, UUID ptId, ReviewActionRequest request);

    ApiResponse<DietLogReviewResponse> submitBlindEstimate(UUID logId, UUID ptId, BlindEstimateRequest request);
}
