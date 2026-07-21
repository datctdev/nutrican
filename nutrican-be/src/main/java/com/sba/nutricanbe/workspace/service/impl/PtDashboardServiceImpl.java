package com.sba.nutricanbe.workspace.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.common.util.RblDatasetFilter;
import com.sba.nutricanbe.common.util.RblMetricsUtil;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.repository.MealPlanRepository;
import com.sba.nutricanbe.diet.service.IntakeControlLoopService;
import com.sba.nutricanbe.user.entity.BodyMetric;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.BodyMetricRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.workspace.dto.PtClientAlertDto;
import com.sba.nutricanbe.workspace.dto.PtRblStatsDto;
import com.sba.nutricanbe.workspace.dto.PtStatsDto;
import com.sba.nutricanbe.workspace.service.PtDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PtDashboardServiceImpl implements PtDashboardService {

    private final PtClientMappingRepository mappingRepository;
    private final DietLogRepository dietLogRepository;
    private final IntakeControlLoopService intakeControlLoopService;
    private final MealPlanRepository mealPlanRepository;
    private final BodyMetricRepository bodyMetricRepository;

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PtStatsDto> getStats(UUID ptId) {
        Page<PtClientMapping> allClients = mappingRepository.findByPt_Id(ptId, PageRequest.of(0, 1));
        List<UUID> clientIds = mappingRepository.findByPtIdWithClients(ptId).stream()
                .filter(m -> m.getStatus() == ClientMappingStatus.ACTIVE)
                .map(m -> m.getClient().getId()).toList();
        long pendingCount = clientIds.isEmpty() ? 0
                : dietLogRepository.findByCustomerIdInAndReviewStatus(
                        clientIds, DietLogReviewStatus.PENDING, PageRequest.of(0, 1)).getTotalElements();

        PtStatsDto stats = PtStatsDto.builder()
                .totalClients((int) allClients.getTotalElements())
                .pendingReviews((int) pendingCount)
                .reviewsThisWeek(0)
                .averageAdherenceRate(BigDecimal.valueOf(85))
                .build();

        return ApiResponse.success(stats);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<PtClientAlertDto>> getClientAlerts(UUID ptId) {
        List<PtClientAlertDto> alerts = new ArrayList<>(
                intakeControlLoopService.getActiveAlertsForPt(ptId));

        List<PtClientMapping> activeMappings = mappingRepository.findByPtIdWithClients(ptId).stream()
                .filter(m -> m.getStatus() == ClientMappingStatus.ACTIVE)
                .toList();

        LocalDate today = DietDates.todayVn();
        LocalDate thisMonday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        for (PtClientMapping mapping : activeMappings) {
            User client = mapping.getClient();

            List<MealPlan> plans = mealPlanRepository.findByClientIdOrderByWeekStartDesc(client.getId());
            if (plans.isEmpty()) {
                alerts.add(PtClientAlertDto.builder()
                        .clientId(client.getId())
                        .clientName(client.getFullName())
                        .reason("Chưa có thực đơn tuần nào được thiết lập")
                        .logDate(today)
                        .alertType("PLAN_EXPIRED")
                        .build());
            } else {
                MealPlan latestPlan = plans.get(0);
                if (latestPlan.getWeekStart().isBefore(thisMonday)) {
                    alerts.add(PtClientAlertDto.builder()
                            .clientId(client.getId())
                            .clientName(client.getFullName())
                            .reason("Đến hạn đổi thực đơn tuần mới (Thực đơn hiện tại từ ngày "
                                    + latestPlan.getWeekStart() + ")")
                            .logDate(today)
                            .alertType("PLAN_EXPIRED")
                            .build());
                }
            }

            Optional<BodyMetric> metricTodayOpt =
                    bodyMetricRepository.findByUser_IdAndRecordDate(client.getId(), today);
            if (metricTodayOpt.isPresent()) {
                BodyMetric metric = metricTodayOpt.get();
                alerts.add(PtClientAlertDto.builder()
                        .clientId(client.getId())
                        .clientName(client.getFullName())
                        .reason("Vừa cập nhật cân nặng mới: " + metric.getWeight() + " kg"
                                + (metric.getBodyFatPercent() != null
                                        ? " (Tỷ lệ mỡ: " + metric.getBodyFatPercent() + "%)" : ""))
                        .logDate(today)
                        .alertType("WEIGHT_CHANGED")
                        .build());
            }
        }

        return ApiResponse.success(alerts);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PtRblStatsDto> getRblStats(UUID ptId) {
        LocalDate start = DietDates.todayVn().minusMonths(1);
        LocalDate end = DietDates.todayVn();
        List<UUID> clientIds = mappingRepository.findByPtIdWithClients(ptId).stream()
                .map(m -> m.getClient().getId()).toList();
        List<DietLog> reviewed = clientIds.isEmpty()
                ? List.of()
                : dietLogRepository.findReviewedByCustomersBetween(clientIds, start, end);
        List<DietLog> labeled = reviewed.stream()
                .filter(l -> RblDatasetFilter.isLabeledForMae(l) && RblDatasetFilter.isCvOnly(l))
                .toList();
        return ApiResponse.success(PtRblStatsDto.builder()
                .totalReviewed(reviewed.size())
                .totalLabeledCv(labeled.size())
                .maeAiCalories(RblMetricsUtil.mae(labeled, "ai", "pt"))
                .adjustRate(RblMetricsUtil.adjustRate(reviewed))
                .build());
    }
}
