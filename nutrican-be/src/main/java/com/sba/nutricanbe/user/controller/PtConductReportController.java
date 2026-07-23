package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.user.dto.PtConductReportResponse;
import com.sba.nutricanbe.user.dto.PtConductReportReviewRequest;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.service.PtConductReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class PtConductReportController {

    private final PtConductReportService reportService;

    @PostMapping(
            value = "/api/v1/profile/mappings/{mappingId}/report-pt",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<PtConductReportResponse>> reportPt(
            @AuthenticationPrincipal User customer,
            @PathVariable UUID mappingId,
            @RequestParam("reason") String reason,
            @RequestParam(value = "files", required = false) MultipartFile[] files) {
        List<MultipartFile> fileList = files == null ? List.of() : Arrays.asList(files);
        return ResponseEntity.ok(ApiResponse.success(
                reportService.reportByCustomer(customer.getId(), mappingId, reason, fileList),
                "Đã gửi báo cáo PT tới admin"));
    }

    @GetMapping("/api/v1/profile/pt-reports")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<PtConductReportResponse>>> listMine(
            @AuthenticationPrincipal User customer) {
        return ResponseEntity.ok(ApiResponse.success(
                reportService.listForCustomer(customer.getId())));
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

    @PostMapping("/api/v1/admin/pts/{ptId}/unsuspend")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PtConductReportResponse>> unsuspendPt(
            @AuthenticationPrincipal User admin,
            @PathVariable UUID ptId) {
        return ResponseEntity.ok(ApiResponse.success(
                reportService.unsuspendPt(admin.getId(), ptId),
                "Đã mở khóa tài khoản PT"));
    }
}
