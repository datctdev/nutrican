package com.sba.nutricanbe.admin.service;

import com.sba.nutricanbe.admin.dto.RblExportRowDto;
import com.sba.nutricanbe.admin.dto.RblStatsResponse;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.RecognitionSource;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface RblAdminService {

    ApiResponse<List<RblExportRowDto>> exportPreview(LocalDate from, LocalDate to, boolean cvOnly, boolean includeRejected);

    ApiResponse<byte[]> exportCsv(LocalDate from, LocalDate to, MealSource mealSource,
                                   RecognitionSource recognitionSource, boolean cvOnly, boolean includeRejected);

    ApiResponse<RblStatsResponse> getStats(LocalDate from, LocalDate to);

    ApiResponse<String> generateReport(LocalDate from, LocalDate to);

    ApiResponse<RblStatsResponse> getPtStats(UUID ptId, LocalDate from, LocalDate to);

    /** G0 / ops: RBL snapshot for any diet log (reviewed or pending). */
    ApiResponse<RblExportRowDto> getLogSnapshot(UUID logId);
}
