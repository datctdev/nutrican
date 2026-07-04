package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.entity.SystemSetting;
import com.sba.nutricanbe.common.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SystemSettingController {

    private final SystemSettingRepository systemSettingRepository;

    @GetMapping("/settings/require-kyc")
    public ResponseEntity<ApiResponse<Boolean>> getRequireKyc() {
        boolean requireKyc = systemSettingRepository.findById("REQUIRE_KYC_FOR_PT")
                .map(setting -> Boolean.parseBoolean(setting.getValue()))
                .orElse(true);
        return ResponseEntity.ok(ApiResponse.success(requireKyc));
    }

    @PutMapping("/admin/settings/require-kyc")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Boolean>> setRequireKyc(@RequestParam boolean value) {
        SystemSetting setting = SystemSetting.builder()
                .key("REQUIRE_KYC_FOR_PT")
                .value(String.valueOf(value))
                .build();
        systemSettingRepository.save(setting);
        return ResponseEntity.ok(ApiResponse.success(value, "Cập nhật cấu hình xác thực thành công"));
    }
}
