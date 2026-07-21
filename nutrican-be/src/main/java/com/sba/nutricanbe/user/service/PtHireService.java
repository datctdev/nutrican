package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.user.dto.HirePtRequest;
import com.sba.nutricanbe.user.dto.PtClientMappingResponse;

import java.util.UUID;

public interface PtHireService {

    ApiResponse<PtClientMappingResponse> hirePt(UUID ptId, UUID customerId, HirePtRequest request);

    ApiResponse<PtClientMappingResponse> updateHireRequest(UUID clientId, UUID ptId, String action);

    ApiResponse<PtClientMappingResponse> getOpenHireRequest(UUID customerId);
}
