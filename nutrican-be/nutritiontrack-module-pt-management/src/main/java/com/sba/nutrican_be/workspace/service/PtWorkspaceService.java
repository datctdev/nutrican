package com.sba.nutrican_be.workspace.service;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.core.entity.*;
import com.sba.nutrican_be.core.enums.*;
import com.sba.nutrican_be.core.exception.BadRequestException;
import com.sba.nutrican_be.core.exception.ResourceNotFoundException;
import com.sba.nutrican_be.core.repository.*;
import com.sba.nutrican_be.workspace.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PtWorkspaceService {

    private final PtClientMappingRepository mappingRepository;
    private final DietLogRepository dietLogRepository;
    private final BodyMetricRepository bodyMetricRepository;
    private final UserRepository userRepository;
    private final SseEmitterService sseEmitterService;

    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<ClientStatusDto>> getClients(Long ptId, int page, int size, String statusFilter) {
        Pageable pageable = PageRequest.of(page, size);
        Page<PtClientMapping> mappings;

        if (statusFilter != null) {
            mappings = mappingRepository.findByPtIdAndStatusWithPagination(
                    ptId, ClientMappingStatus.valueOf(statusFilter), pageable);
        } else {
            mappings = mappingRepository.findByPt_Id(ptId, pageable);
        }

        Page<ClientStatusDto> mapped = mappings.map(this::toClientStatus);
        return ApiResponse.success(PageResponse.from(mapped));
    }

    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<DietLogReviewResponse>> getPendingLogs(Long ptId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<DietLog> logPage = dietLogRepository.findByPtReviewerIdAndStatus(
                ptId, DietLogStatus.PT_REVIEWING, pageable);
        Page<DietLogReviewResponse> mapped = logPage.map(this::toReviewResponse);
        return ApiResponse.success(PageResponse.from(mapped));
    }

    @Transactional
    public ApiResponse<DietLogReviewResponse> reviewLog(Long logId, Long ptId, ReviewActionRequest request) {
        DietLog dietLog = dietLogRepository.findByIdWithCustomer(logId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", logId));

        User pt = userRepository.findById(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT", ptId));

        dietLog.setPtReviewer(pt);

        switch (request.getAction().toUpperCase()) {
            case "APPROVE" -> {
                dietLog.setStatus(DietLogStatus.APPROVED);
                if (request.getNote() != null) dietLog.setPtNote(request.getNote());
            }
            case "ADJUST_MACROS" -> {
                dietLog.setStatus(DietLogStatus.APPROVED);
                Map<String, Object> adjusted = new HashMap<>();
                adjusted.put("calories", request.getAdjustedCalories() != null ? request.getAdjustedCalories() : BigDecimal.ZERO);
                adjusted.put("protein", request.getAdjustedProtein() != null ? request.getAdjustedProtein() : BigDecimal.ZERO);
                adjusted.put("carb", request.getAdjustedCarb() != null ? request.getAdjustedCarb() : BigDecimal.ZERO);
                adjusted.put("fat", request.getAdjustedFat() != null ? request.getAdjustedFat() : BigDecimal.ZERO);
                adjusted.put("adjusted", true);
                dietLog.setMacrosJson(adjusted);
                dietLog.setPtNote(request.getNote());
            }
            case "REJECT" -> {
                dietLog.setStatus(DietLogStatus.REJECTED);
                dietLog.setPtNote(request.getNote());
            }
            default -> throw new BadRequestException("Invalid action: " + request.getAction());
        }

        dietLog = dietLogRepository.save(dietLog);
        log.info("Diet log {} reviewed by PT {}: action={}", logId, ptId, request.getAction());

        notifyClientOfReview(dietLog.getCustomer().getId(), logId, dietLog.getStatus().name());

        return ApiResponse.success(toReviewResponse(dietLog), "Log reviewed successfully");
    }

    @Transactional(readOnly = true)
    public ApiResponse<ProgressDataDto> getClientProgress(Long ptId, Long clientId, LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusMonths(1);
        if (endDate == null) endDate = LocalDate.now();

        List<DietLog> logs = dietLogRepository.findByCustomerIdAndLogDateBetween(clientId, startDate, endDate, PageRequest.of(0, 1000)).getContent();

        List<BodyMetric> metrics = bodyMetricRepository.findByUserIdAndDateRange(clientId, startDate, endDate);

        List<ProgressDataDto.DailyCalorieData> calorieData = new ArrayList<>();
        BigDecimal totalCalories = BigDecimal.ZERO;
        BigDecimal totalProtein = BigDecimal.ZERO;
        BigDecimal totalCarb = BigDecimal.ZERO;
        BigDecimal totalFat = BigDecimal.ZERO;
        int logCount = 0;

        for (DietLog log : logs) {
            if (log.getMacrosJson() != null) {
                calorieData.add(ProgressDataDto.DailyCalorieData.builder()
                        .date(log.getLogDate())
                        .calories(toBd(log.getMacrosJson().get("calories")))
                        .target(BigDecimal.valueOf(2000))
                        .build());

                totalCalories = add(totalCalories, toBd(log.getMacrosJson().get("calories")));
                totalProtein = add(totalProtein, toBd(log.getMacrosJson().get("protein")));
                totalCarb = add(totalCarb, toBd(log.getMacrosJson().get("carb")));
                totalFat = add(totalFat, toBd(log.getMacrosJson().get("fat")));
                logCount++;
            }
        }

        List<ProgressDataDto.BodyMetricData> metricData = metrics.stream()
                .map(m -> ProgressDataDto.BodyMetricData.builder()
                        .date(m.getRecordDate())
                        .weight(m.getWeight())
                        .bodyFatPercent(m.getBodyFatPercent())
                        .lbm(m.getLbm())
                        .build())
                .toList();

        ProgressDataDto.MacroSummary macroSummary = null;
        if (logCount > 0) {
            BigDecimal adherence = BigDecimal.valueOf(logCount)
                    .divide(BigDecimal.valueOf(calorieData.size()), 2, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            macroSummary = ProgressDataDto.MacroSummary.builder()
                    .avgCalories(totalCalories.divide(BigDecimal.valueOf(logCount), 1, RoundingMode.HALF_UP))
                    .avgProtein(totalProtein.divide(BigDecimal.valueOf(logCount), 1, RoundingMode.HALF_UP))
                    .avgCarb(totalCarb.divide(BigDecimal.valueOf(logCount), 1, RoundingMode.HALF_UP))
                    .avgFat(totalFat.divide(BigDecimal.valueOf(logCount), 1, RoundingMode.HALF_UP))
                    .adherenceRate(adherence)
                    .build();
        }

        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("User", clientId));

        ProgressDataDto response = ProgressDataDto.builder()
                .clientId(clientId)
                .clientName(client.getFullName())
                .calorieHistory(calorieData)
                .bodyMetrics(metricData)
                .macroSummary(macroSummary)
                .build();

        return ApiResponse.success(response);
    }

    @Transactional
    public ApiResponse<Void> assignClient(Long ptId, Long clientId) {
        if (mappingRepository.existsByPt_IdAndClient_Id(ptId, clientId)) {
            throw new BadRequestException("Client already assigned to this PT");
        }

        User pt = userRepository.findById(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT", ptId));
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client", clientId));

        PtClientMapping mapping = PtClientMapping.builder()
                .pt(pt)
                .client(client)
                .status(ClientMappingStatus.ACTIVE)
                .build();

        mappingRepository.save(mapping);
        log.info("Client {} assigned to PT {}", clientId, ptId);
        return ApiResponse.success(null, "Client assigned successfully");
    }

    @Transactional(readOnly = true)
    public ApiResponse<PtStatsDto> getStats(Long ptId) {
        Page<PtClientMapping> allClients = mappingRepository.findByPt_Id(ptId, PageRequest.of(0, 1));
        Page<DietLog> pendingReviews = dietLogRepository.findByPtReviewerIdAndStatus(
                ptId, DietLogStatus.PT_REVIEWING, PageRequest.of(0, 1));

        PtStatsDto stats = PtStatsDto.builder()
                .totalClients((int) allClients.getTotalElements())
                .pendingReviews((int) pendingReviews.getTotalElements())
                .pendingSosTickets(0)
                .reviewsThisWeek(0)
                .averageAdherenceRate(BigDecimal.valueOf(85))
                .build();

        return ApiResponse.success(stats);
    }

    private ClientStatusDto toClientStatus(PtClientMapping mapping) {
        User client = mapping.getClient();
        String statusColor = "GREEN";
        String statusLabel = "On Track";
        String lastLog = "N/A";

        List<DietLog> recentLogs = dietLogRepository.findByCustomerIdAndLogDate(
                client.getId(), LocalDate.now());

        if (recentLogs.isEmpty()) {
            statusColor = "YELLOW";
            statusLabel = "Missing Log";
        }

        return ClientStatusDto.builder()
                .clientId(client.getId())
                .clientName(client.getFullName())
                .avatarUrl(client.getAvatarUrl())
                .status(statusColor)
                .statusLabel(statusLabel)
                .statusColor(statusColor)
                .lastLogTime(lastLog)
                .avgCalories(BigDecimal.valueOf(1800.0))
                .build();
    }

    private DietLogReviewResponse toReviewResponse(DietLog log) {
        User customer = log.getCustomer();
        return DietLogReviewResponse.builder()
                .id(log.getId())
                .customerId(customer.getId())
                .customerName(customer.getFullName())
                .customerAvatar(customer.getAvatarUrl())
                .imageUrl(log.getImageUrl())
                .mealType(log.getMealType())
                .foodDescription(log.getFoodDescription())
                .aiConfidenceScore(log.getAiConfidenceScore())
                .macrosJson(log.getMacrosJson())
                .status(log.getStatus())
                .sosTicketFlag(log.getSosTicketFlag())
                .logDate(log.getLogDate())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private void notifyClientOfReview(Long clientId, Long logId, String status) {
        log.info("Notifying client {} about review of log {}: status={}", clientId, logId, status);
    }

    private BigDecimal toBd(Object val) {
        if (val == null) return BigDecimal.ZERO;
        if (val instanceof BigDecimal) return (BigDecimal) val;
        try { return new BigDecimal(val.toString()); } catch (Exception e) { return BigDecimal.ZERO; }
    }

    private BigDecimal add(BigDecimal a, BigDecimal b) {
        if (a == null) a = BigDecimal.ZERO;
        if (b == null) b = BigDecimal.ZERO;
        return a.add(b);
    }
}
