package com.sba.nutrican_be.admin.service;

import com.sba.nutrican_be.admin.dto.PendingKycDto;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;

import java.util.UUID;

public interface KycAdminService {

    ApiResponse<PageResponse<PendingKycDto>> getPendingKycs(int page, int size);

    ApiResponse<Void> approveKyc(UUID userId);

    ApiResponse<Void> rejectKyc(UUID userId, String reason);
}
