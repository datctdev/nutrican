package com.sba.nutricanbe.diet.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.diet.dto.request.SelfPlanItemRequest;
import com.sba.nutricanbe.diet.dto.request.SelfPlanItemUpdateRequest;
import com.sba.nutricanbe.diet.dto.response.DayPlanResponse;
import com.sba.nutricanbe.diet.dto.response.DietLogResponse;
import com.sba.nutricanbe.diet.dto.response.SelfPlanItemResponse;
import com.sba.nutricanbe.diet.dto.response.SelfPlanSubmissionResponse;
import com.sba.nutricanbe.diet.enums.SelfPlanSubmissionStatus;
import com.sba.nutricanbe.diet.service.DayPlanService;
import com.sba.nutricanbe.diet.service.SelfPlanService;
import com.sba.nutricanbe.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/diet")
@RequiredArgsConstructor
public class DayPlanController {

    private final SelfPlanService selfPlanService;
    private final DayPlanService dayPlanService;

    @GetMapping("/day-plan")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<DayPlanResponse>> getDayPlan(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(dayPlanService.getDayPlan(user.getId(), date)));
    }

    @GetMapping("/self-plan")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<SelfPlanItemResponse>>> listSelfPlan(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(selfPlanService.list(user.getId(), date)));
    }

    @PostMapping("/self-plan")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<SelfPlanItemResponse>> createSelfPlan(
            @AuthenticationPrincipal User user,
            @RequestBody SelfPlanItemRequest request) {
        return ResponseEntity.ok(ApiResponse.success(selfPlanService.create(user.getId(), request), "Đã thêm vào plan"));
    }

    @PutMapping("/self-plan/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<SelfPlanItemResponse>> updateSelfPlan(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @RequestBody SelfPlanItemUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(selfPlanService.update(user.getId(), id, request)));
    }

    @DeleteMapping("/self-plan/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Void>> deleteSelfPlan(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        selfPlanService.delete(user.getId(), id);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa"));
    }

    @PostMapping("/self-plan/{id}/eaten")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<DietLogResponse>> markSelfPlanEaten(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @RequestParam(required = false) String lateTickReason) {
        return ResponseEntity.ok(ApiResponse.success(
                selfPlanService.markEaten(user.getId(), id, lateTickReason), "Đã ghi vào nhật ký"));
    }

    @PostMapping("/self-plan/submit")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<SelfPlanSubmissionResponse>> submitSelfPlan(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(
                selfPlanService.submit(user.getId(), date), "Đã gửi PT duyệt"));
    }

    @PostMapping("/self-plan/submissions/{id}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<SelfPlanSubmissionResponse>> cancelSelfPlanSubmission(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(
                selfPlanService.cancel(user.getId(), id), "Đã hủy yêu cầu duyệt"));
    }

    @GetMapping("/self-plan/submissions")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<SelfPlanSubmissionResponse>>> listSelfPlanSubmissions(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) SelfPlanSubmissionStatus status) {
        return ResponseEntity.ok(ApiResponse.success(
                selfPlanService.listSubmissions(user.getId(), date, status)));
    }
}
