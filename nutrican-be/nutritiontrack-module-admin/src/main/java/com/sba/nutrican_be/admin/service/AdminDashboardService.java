package com.sba.nutrican_be.admin.service;

import com.sba.nutrican_be.admin.dto.AdminDashboardDto;
import com.sba.nutrican_be.core.dto.ApiResponse;

public interface AdminDashboardService {

    ApiResponse<AdminDashboardDto> getDashboardStats();
}
