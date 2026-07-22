package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.user.dto.PtConductReportRequest;
import com.sba.nutricanbe.user.dto.PtConductReportResponse;
import com.sba.nutricanbe.user.dto.PtConductReportReviewRequest;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.service.PtConductReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class PtConductReportController {

    private final PtConductReportService reportService;

    @PostMapping("/api/v1/profile/mappings/{mappingId}/report-pt")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<PtConductReportResponse>> reportPt(
            @AuthenticationPrincipal User customer,
            @PathVariable UUID mappingId,
            @RequestBody PtConductReportRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                reportService.reportByCustomer(customer.getId(), mappingId, request),
                "Đã gửi báo cáo PT tới admin"));
    }

    @GetMapping("/api/v1/admin/pt-reports")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<PtConductReportResponse>>> list(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.success(reportService.listForAdmin(status)));
    }

    @PutMapping("/api/v1/admin/pt-reports/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PtConductReportResponse>> resolve(
            @AuthenticationPrincipal User admin,
            @PathVariable UUID id,
            @RequestBody PtConductReportReviewRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                reportService.resolveByAdmin(admin.getId(), id, request),
                "Đã cập nhật báo cáo PT"));
    }
}
