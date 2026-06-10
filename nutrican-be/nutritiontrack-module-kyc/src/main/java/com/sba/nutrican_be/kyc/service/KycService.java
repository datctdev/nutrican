package com.sba.nutrican_be.kyc.service;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.kyc.dto.request.KycRequest;
import com.sba.nutrican_be.kyc.dto.request.PtRequestDto;
import com.sba.nutrican_be.kyc.dto.response.KycStatusDto;

import java.util.UUID;

public interface KycService {

    ApiResponse<Void> submitKyc(UUID userId, KycRequest request);

    ApiResponse<KycStatusDto> getKycStatus(UUID userId);

    ApiResponse<Void> requestPt(UUID userId, PtRequestDto request);
}
