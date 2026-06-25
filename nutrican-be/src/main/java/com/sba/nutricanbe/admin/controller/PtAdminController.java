package com.sba.nutricanbe.admin.controller;

import com.sba.nutricanbe.admin.dto.PendingPtDto;
import com.sba.nutricanbe.admin.dto.PtVerificationRequest;
import com.sba.nutricanbe.admin.service.PtAdminService;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/pts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class PtAdminController {

    private final PtAdminService ptAdminService;

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<PageResponse<PendingPtDto>>> getPendingPts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ptAdminService.getPendingPts(page, size));
    }

    @PutMapping("/{userId}/verify")
    public ResponseEntity<ApiResponse<Void>> verifyPt(
            @PathVariable UUID userId,
            @RequestBody PtVerificationRequest request) {
        return ResponseEntity.ok(ptAdminService.verifyPt(userId, request));
    }

    @GetMapping("/{ptId}/documents")
    public ResponseEntity<ApiResponse<PageResponse<PendingPtDto>>> getPtDocuments(
            @PathVariable UUID ptId) {
        return ResponseEntity.ok(ptAdminService.getPtDocuments(ptId));
    }
}
