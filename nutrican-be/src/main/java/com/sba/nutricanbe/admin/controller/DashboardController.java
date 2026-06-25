package com.sba.nutricanbe.admin.controller;

import com.sba.nutricanbe.admin.dto.AdminDashboardDto;
import com.sba.nutricanbe.admin.service.AdminDashboardService;
import com.sba.nutricanbe.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class DashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminDashboardDto>> getStats() {
        return ResponseEntity.ok(adminDashboardService.getDashboardStats());
    }
}
