package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.service.SystemSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SystemSettingController {

    private final SystemSettingService systemSettingService;

    @GetMapping("/settings/require-kyc")
    public ResponseEntity<ApiResponse<Boolean>> getRequireKyc() {
        return ResponseEntity.ok(ApiResponse.success(systemSettingService.isRequireKycForPt()));
    }

    @PutMapping("/admin/settings/require-kyc")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Boolean>> setRequireKyc(@RequestParam boolean value) {
        systemSettingService.setRequireKycForPt(value);
        return ResponseEntity.ok(ApiResponse.success(value, "Cập nhật cấu hình xác thực thành công"));
    }

    @GetMapping("/settings/platform-fee-rate")
    public ResponseEntity<ApiResponse<BigDecimal>> getPlatformFeeRate() {
        return ResponseEntity.ok(ApiResponse.success(systemSettingService.getPlatformFeeRate()));
    }

    @PutMapping("/admin/settings/platform-fee-rate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<BigDecimal>> setPlatformFeeRate(@RequestParam BigDecimal value) {
        systemSettingService.setPlatformFeeRate(value);
        return ResponseEntity.ok(ApiResponse.success(value, "Cập nhật hoa hồng thành công"));
    }
}
