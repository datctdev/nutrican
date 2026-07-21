package com.sba.nutricanbe.workspace.service;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.workspace.dto.PtClientAlertDto;
import com.sba.nutricanbe.workspace.dto.PtRblStatsDto;
import com.sba.nutricanbe.workspace.dto.PtStatsDto;

import java.util.List;
import java.util.UUID;

public interface PtDashboardService {

    ApiResponse<PtStatsDto> getStats(UUID ptId);

    ApiResponse<List<PtClientAlertDto>> getClientAlerts(UUID ptId);

    ApiResponse<PtRblStatsDto> getRblStats(UUID ptId);
}
