package com.sba.nutrican_be.auth.service;

import com.sba.nutrican_be.auth.dto.KycRequest;
import com.sba.nutrican_be.auth.dto.KycStatusDto;
import com.sba.nutrican_be.auth.dto.PtRequestDto;
import com.sba.nutrican_be.core.dto.ApiResponse;

public interface KycService {

    ApiResponse<Void> submitKyc(java.util.UUID userId, KycRequest request);

    ApiResponse<KycStatusDto> getKycStatus(java.util.UUID userId);

    ApiResponse<Void> requestPt(java.util.UUID userId, PtRequestDto request);
}
