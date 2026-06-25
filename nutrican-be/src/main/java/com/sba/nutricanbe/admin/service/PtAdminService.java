package com.sba.nutricanbe.admin.service;

import com.sba.nutricanbe.admin.dto.PendingPtDto;
import com.sba.nutricanbe.admin.dto.PtVerificationRequest;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;

import java.util.UUID;

public interface PtAdminService {

    ApiResponse<PageResponse<PendingPtDto>> getPendingPts(int page, int size);

    ApiResponse<Void> verifyPt(UUID userId, PtVerificationRequest request);

    ApiResponse<PageResponse<PendingPtDto>> getPtDocuments(UUID ptId);
}
