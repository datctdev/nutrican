package com.sba.nutricanbe.admin.service;

import com.sba.nutricanbe.admin.dto.AdminDashboardDto;
import com.sba.nutricanbe.common.dto.ApiResponse;

public interface AdminDashboardService {

    ApiResponse<AdminDashboardDto> getDashboardStats();
}
