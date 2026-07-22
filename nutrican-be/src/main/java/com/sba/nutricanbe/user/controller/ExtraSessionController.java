package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.payment.dto.ExtraSessionsPurchaseResponse;
import com.sba.nutricanbe.user.dto.ExtraSessionsRequest;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.service.ExtraSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/coaching/mappings")
@RequiredArgsConstructor
public class ExtraSessionController {

    private final ExtraSessionService extraSessionService;

    @PostMapping("/{mappingId}/extra-sessions")
    public ResponseEntity<ApiResponse<ExtraSessionsPurchaseResponse>> purchaseExtraSessions(
            @AuthenticationPrincipal User user,
            @PathVariable UUID mappingId,
            @RequestBody ExtraSessionsRequest request) {
        ExtraSessionsPurchaseResponse result = extraSessionService.purchase(mappingId, user.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(result, result.getMessage()));
    }
}
