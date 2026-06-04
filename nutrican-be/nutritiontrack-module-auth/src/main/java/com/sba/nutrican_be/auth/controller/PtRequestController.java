package com.sba.nutrican_be.auth.controller;

import com.sba.nutrican_be.auth.dto.PtRequestDto;
import com.sba.nutrican_be.auth.service.KycService;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/pt")
@RequiredArgsConstructor
public class PtRequestController {

    private final KycService kycService;

    @PostMapping("/request")
    public ResponseEntity<ApiResponse<Void>> requestPt(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody PtRequestDto request) {
        return ResponseEntity.ok(kycService.requestPt(user.getId(), request));
    }
}
