package com.sba.nutrican_be.kyc.controller;

import com.sba.nutrican_be.core.config.CurrentUser;
import com.sba.nutrican_be.core.config.CurrentUserInfo;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.kyc.dto.request.KycRequest;
import com.sba.nutrican_be.kyc.dto.request.PtRequestDto;
import com.sba.nutrican_be.kyc.dto.response.KycStatusDto;
import com.sba.nutrican_be.kyc.service.KycService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth/kyc")
@RequiredArgsConstructor
public class UserKycController {

    private final KycService kycService;

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> submitKyc(
            @CurrentUser CurrentUserInfo user,
            @Valid @RequestBody KycRequest request) {
        return ResponseEntity.ok(kycService.submitKyc(user.getUserId(), request));
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<KycStatusDto>> getKycStatus(
            @CurrentUser CurrentUserInfo user) {
        return ResponseEntity.ok(kycService.getKycStatus(user.getUserId()));
    }

    @PostMapping("/pt-request")
    public ResponseEntity<ApiResponse<Void>> requestPt(
            @CurrentUser CurrentUserInfo user,
            @Valid @RequestBody PtRequestDto request) {
        return ResponseEntity.ok(kycService.requestPt(user.getUserId(), request));
    }
}
