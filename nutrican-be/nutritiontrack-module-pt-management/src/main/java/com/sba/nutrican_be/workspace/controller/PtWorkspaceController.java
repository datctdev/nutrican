package com.sba.nutrican_be.workspace.controller;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.workspace.dto.*;
import com.sba.nutrican_be.workspace.service.PtWorkspaceService;
import com.sba.nutrican_be.workspace.service.SseEmitterService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workspace")
@RequiredArgsConstructor
public class PtWorkspaceController {

    private final PtWorkspaceService ptWorkspaceService;
    private final SseEmitterService sseEmitterService;

    @GetMapping("/clients")
    public ResponseEntity<ApiResponse<PageResponse<ClientStatusDto>>> getClients(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ptWorkspaceService.getClients(user.getId(), page, size, status));
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal User user) {
        return sseEmitterService.createEmitter(user.getId());
    }

    @GetMapping("/diet-logs/pending")
    public ResponseEntity<ApiResponse<PageResponse<DietLogReviewResponse>>> getPendingLogs(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ptWorkspaceService.getPendingLogs(user.getId(), page, size));
    }

    @PutMapping("/diet-logs/{id}/review")
    public ResponseEntity<ApiResponse<DietLogReviewResponse>> reviewLog(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user,
            @RequestBody ReviewActionRequest request) {
        return ResponseEntity.ok(ptWorkspaceService.reviewLog(id, user.getId(), request));
    }

    @GetMapping("/progress/{clientId}")
    public ResponseEntity<ApiResponse<ProgressDataDto>> getClientProgress(
            @PathVariable UUID clientId,
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(ptWorkspaceService.getClientProgress(user.getId(), clientId, startDate, endDate));
    }

    @PostMapping("/clients/{clientId}/assign")
    public ResponseEntity<ApiResponse<Void>> assignClient(
            @PathVariable UUID clientId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ptWorkspaceService.assignClient(user.getId(), clientId));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<PtStatsDto>> getStats(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ptWorkspaceService.getStats(user.getId()));
    }
}
