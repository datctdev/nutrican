package com.sba.nutricanbe.workspace.service;

import com.sba.nutricanbe.chat.dto.ChatContextSummaryDto;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.diet.dto.response.DayPlanResponse;
import com.sba.nutricanbe.diet.dto.response.DayTimelineResponse;
import com.sba.nutricanbe.diet.dto.response.DietSummaryResponse;
import com.sba.nutricanbe.workspace.dto.ProgressDataDto;

import java.time.LocalDate;
import java.util.UUID;

public interface PtProgressService {

    ApiResponse<ProgressDataDto> getClientProgress(UUID ptId, UUID clientId, LocalDate startDate, LocalDate endDate);

    ApiResponse<ProgressDataDto> getClientProgress(
            UUID ptId, UUID clientId, LocalDate startDate, LocalDate endDate, LocalDate mealPlanWeekStart);

    ApiResponse<ChatContextSummaryDto> getChatContext(UUID ptId, UUID clientId);

    ApiResponse<DayPlanResponse> getClientDayPlan(UUID ptId, UUID clientId, LocalDate date);

    ApiResponse<DietSummaryResponse> getClientDietSummary(UUID ptId, UUID clientId, LocalDate date);

    ApiResponse<DayTimelineResponse> getClientDayTimeline(UUID ptId, UUID clientId, LocalDate date);
}
