package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.user.dto.MappingSessionResponse;
import com.sba.nutricanbe.user.dto.SessionDisputeRequest;
import com.sba.nutricanbe.user.dto.SessionDisputeResponse;
import com.sba.nutricanbe.user.dto.SessionDisputeReviewRequest;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.service.MappingSessionConfirmService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class MappingSessionConfirmController {

    private final MappingSessionConfirmService confirmService;

    @PostMapping("/api/v1/workspace/sessions/{sessionId}/mark-done")
    @PreAuthorize("hasAnyRole('PT_CERTIFIED', 'PT_FREELANCE')")
    public ResponseEntity<ApiResponse<MappingSessionResponse>> markDone(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId) {
        return ResponseEntity.ok(ApiResponse.success(
                confirmService.markDone(user.getId(), sessionId),
                "Đã gửi xác nhận buổi tập cho khách hàng"));
    }

    @PostMapping("/api/v1/profile/sessions/{sessionId}/confirm")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<MappingSessionResponse>> confirm(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId) {
        return ResponseEntity.ok(ApiResponse.success(
                confirmService.confirmByCustomer(user.getId(), sessionId),
                "Đã xác nhận buổi tập"));
    }

    @PostMapping("/api/v1/profile/sessions/{sessionId}/dispute")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<MappingSessionResponse>> dispute(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId,
            @RequestBody SessionDisputeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                confirmService.disputeByCustomer(user.getId(), sessionId, request),
                "Đã gửi khiếu nại buổi tập"));
    }

    @GetMapping("/api/v1/profile/sessions")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<MappingSessionResponse>>> mySessions(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(confirmService.listSessionsForCustomer(user.getId())));
    }

    @GetMapping("/api/v1/admin/session-disputes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<SessionDisputeResponse>>> listDisputes(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.success(confirmService.listDisputes(status)));
    }

    @PutMapping("/api/v1/admin/session-disputes/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SessionDisputeResponse>> resolveDispute(
            @PathVariable UUID id,
            @RequestBody SessionDisputeReviewRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                confirmService.resolveDispute(id, request),
                "Đã xử lý tranh chấp buổi tập"));
    }
}
