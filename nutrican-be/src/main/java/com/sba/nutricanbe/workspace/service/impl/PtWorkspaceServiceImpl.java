package com.sba.nutricanbe.workspace.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;

import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.SosTicket;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.BodyMetric;

import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.repository.DietLogImageRepository;
import com.sba.nutricanbe.diet.repository.SosTicketRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.repository.BodyMetricRepository;
import com.sba.nutricanbe.user.service.UserQueryService;

import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.PtCorrectionReason;
import com.sba.nutricanbe.diet.enums.PtReviewAction;
import com.sba.nutricanbe.diet.enums.SosTicketStatus;
import com.sba.nutricanbe.diet.dto.SosTicketResponse;
import com.sba.nutricanbe.common.util.MacroUtils;
import com.sba.nutricanbe.common.util.RblDatasetFilter;
import com.sba.nutricanbe.common.util.RblMetricsUtil;
import com.sba.nutricanbe.workspace.dto.*;
import com.sba.nutricanbe.workspace.service.PtWorkspaceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.sba.nutricanbe.common.dto.MacroNutrients;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PtWorkspaceServiceImpl implements PtWorkspaceService {

    private final PtClientMappingRepository mappingRepository;
    private final DietLogRepository dietLogRepository;
    private final BodyMetricRepository bodyMetricRepository;
    private final UserRepository userRepository;
    private final DietLogImageRepository dietLogImageRepository;
    private final SosTicketRepository sosTicketRepository;
    private final UserQueryService userQueryService;
    private final com.sba.nutricanbe.workspace.service.WebSocketSessionService webSocketSessionService;

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<ClientStatusDto>> getClients(UUID ptId, int page, int size, String statusFilter) {
        Pageable pageable = PageRequest.of(page, size);
        Page<PtClientMapping> mappings;

        if (statusFilter != null) {
            mappings = mappingRepository.findByPtIdAndStatusWithPagination(
                    ptId, ClientMappingStatus.valueOf(statusFilter), pageable);
        } else {
            mappings = mappingRepository.findByPt_Id(ptId, pageable);
        }

        return ApiResponse.success(PageResponse.from(mappings.map(this::toClientStatus)));
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<DietLogReviewResponse>> getPendingLogs(UUID ptId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        List<UUID> clientIds = mappingRepository.findByPtIdWithClients(ptId).stream()
                .filter(m -> m.getStatus() == ClientMappingStatus.ACTIVE)
                .map(m -> m.getClient().getId())
                .toList();

        if (clientIds.isEmpty()) {
            return ApiResponse.success(PageResponse.from(Page.empty(pageable)));
        }

        Page<DietLog> logPage = dietLogRepository.findByCustomerIdInAndStatus(
                clientIds, DietLogStatus.PT_REVIEWING, pageable);

        List<DietLogReviewResponse> filteredResponses = logPage.getContent().stream()
                .filter(log -> log.getMacrosJson() != null && log.getMacrosJson().calories() != null)
                .map(this::toReviewResponse)
                .toList();

        PageResponse<DietLogReviewResponse> customPageResponse = PageResponse.<DietLogReviewResponse>builder()
                .content(filteredResponses)
                .page(logPage.getNumber())
                .size(logPage.getSize())
                .totalElements(filteredResponses.size())
                .totalPages((int) Math.ceil((double) filteredResponses.size() / size))
                .last(logPage.isLast())
                .build();

        return ApiResponse.success(customPageResponse);
    }

    @Override
    @Transactional
    public ApiResponse<DietLogReviewResponse> reviewLog(UUID logId, UUID ptId, ReviewActionRequest request) {
        DietLog dietLog = dietLogRepository.findByIdWithCustomer(logId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", logId));

        User pt = userRepository.findById(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT", ptId));

        if (!mappingRepository.existsByPt_IdAndClient_Id(ptId, dietLog.getCustomerId())) {
            throw new BadRequestException("You can only review logs from your assigned clients");
        }

        dietLog.setPtReviewerId(ptId);
        dietLog.setMacrosAtReview(MacroUtils.copyMacroMap(dietLog.getMacrosJson()));
        PtCorrectionReason reason = request.getCorrectionReason() != null
                ? request.getCorrectionReason() : PtCorrectionReason.OTHER;
        dietLog.setPtCorrectionReason(reason);
        dietLog.setPtReviewedAt(LocalDateTime.now());

        switch (request.getAction().toUpperCase()) {
            case "APPROVE" -> {
                dietLog.setStatus(DietLogStatus.APPROVED);
                dietLog.setPtAction(PtReviewAction.APPROVE);
                dietLog.setPtAdjustedMacros(MacroUtils.copyMacroMap(dietLog.getMacrosAtReview()));
                if (request.getNote() != null) dietLog.setPtNote(request.getNote());
            }
            case "ADJUST_MACROS" -> {
                dietLog.setStatus(DietLogStatus.APPROVED);
                dietLog.setPtAction(PtReviewAction.ADJUST);
                MacroNutrients adjusted = MacroUtils.buildAdjustedMacroMap(
                        request.getAdjustedCalories(),
                        request.getAdjustedProtein(),
                        request.getAdjustedCarb(),
                        request.getAdjustedFat()
                );
                dietLog.setMacrosJson(adjusted);
                dietLog.setPtAdjustedMacros(adjusted);
                dietLog.setPtNote(request.getNote());
            }
            case "REJECT" -> {
                dietLog.setStatus(DietLogStatus.REJECTED);
                dietLog.setPtAction(PtReviewAction.REJECT);
                dietLog.setPtAdjustedMacros(null);
                dietLog.setPtNote(request.getNote());
            }
            default -> throw new BadRequestException("Invalid action: " + request.getAction());
        }

        dietLog = dietLogRepository.save(dietLog);
        log.info("Diet log {} reviewed by PT {}: action={}", logId, ptId, request.getAction());

        notifyClientOfReview(dietLog.getCustomerId(), logId, dietLog.getStatus().name());

        return ApiResponse.success(toReviewResponse(dietLog), "Log reviewed successfully");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<ProgressDataDto> getClientProgress(UUID ptId, UUID clientId, LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusMonths(1);
        if (endDate == null) endDate = LocalDate.now();

        List<DietLog> logs = dietLogRepository.findByCustomerIdAndLogDateBetween(
                clientId, startDate, endDate, PageRequest.of(0, 1000)).getContent();

        List<BodyMetric> metrics = bodyMetricRepository.findByUserIdAndDateRange(clientId, startDate, endDate);

        List<ProgressDataDto.DailyCalorieData> calorieData = new ArrayList<>();
        BigDecimal totalCalories = MacroUtils.ZERO;
        BigDecimal totalProtein = MacroUtils.ZERO;
        BigDecimal totalCarb = MacroUtils.ZERO;
        BigDecimal totalFat = MacroUtils.ZERO;
        int logCount = 0;

        for (DietLog log : logs) {
            if (log.getMacrosJson() != null) {
                calorieData.add(ProgressDataDto.DailyCalorieData.builder()
                        .date(log.getLogDate())
                        .calories(log.getMacrosJson().calories())
                        .target(BigDecimal.valueOf(2000))
                        .build());

                totalCalories = MacroUtils.add(totalCalories, log.getMacrosJson().calories());
                totalProtein = MacroUtils.add(totalProtein, log.getMacrosJson().protein());
                totalCarb = MacroUtils.add(totalCarb, log.getMacrosJson().carbs());
                totalFat = MacroUtils.add(totalFat, log.getMacrosJson().fat());
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

    @Override
    @Transactional
    public ApiResponse<Void> assignClient(UUID ptId, UUID clientId) {
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

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PtStatsDto> getStats(UUID ptId) {
        Page<PtClientMapping> allClients = mappingRepository.findByPt_Id(ptId, PageRequest.of(0, 1));
        List<UUID> clientIds = mappingRepository.findByPtIdWithClients(ptId).stream()
                .filter(m -> m.getStatus() == ClientMappingStatus.ACTIVE)
                .map(m -> m.getClient().getId()).toList();
        long pendingCount = clientIds.isEmpty() ? 0
                : dietLogRepository.findByCustomerIdInAndStatus(clientIds, DietLogStatus.PT_REVIEWING, PageRequest.of(0, 1)).getTotalElements();
        long pendingSos = sosTicketRepository.findByPt_IdAndStatus(ptId, SosTicketStatus.ASSIGNED, PageRequest.of(0, 1)).getTotalElements();

        PtStatsDto stats = PtStatsDto.builder()
                .totalClients((int) allClients.getTotalElements())
                .pendingReviews((int) pendingCount)
                .pendingSosTickets((int) pendingSos)
                .reviewsThisWeek(0)
                .averageAdherenceRate(BigDecimal.valueOf(85))
                .build();

        return ApiResponse.success(stats);
    }

    private ClientStatusDto toClientStatus(PtClientMapping mapping) {
        User client = mapping.getClient();
        List<DietLog> recentLogs = dietLogRepository.findByCustomerIdAndLogDate(
                client.getId(), LocalDate.now());

        String statusColor;
        String statusLabel;
        if (recentLogs.isEmpty()) {
            statusColor = "YELLOW";
            statusLabel = "Missing Log";
        } else {
            statusColor = "GREEN";
            statusLabel = "On Track";
        }

        return ClientStatusDto.builder()
                .clientId(client.getId())
                .clientName(client.getFullName())
                .avatarUrl(client.getAvatarUrl())
                .status(statusColor)
                .statusLabel(statusLabel)
                .statusColor(statusColor)
                .lastLogTime("N/A")
                .avgCalories(BigDecimal.valueOf(1800.0))
                .build();
    }

    private DietLogReviewResponse toReviewResponse(DietLog log) {
        User customer = userQueryService.findUserById(log.getCustomerId()).orElse(null);
        String customerName = customer != null ? customer.getFullName() : null;
        String customerAvatar = customer != null ? customer.getAvatarUrl() : null;

        List<DietLogReviewResponse.AdditionalImageInfo> additionalImages = log.getAdditionalImages() == null ? null : log.getAdditionalImages().stream()
                .map(img -> DietLogReviewResponse.AdditionalImageInfo.builder()
                        .id(img.getId())
                        .imageUrl(img.getImageUrl())
                        .isPrimary(img.getIsPrimary())
                        .sortOrder(img.getSortOrder())
                        .build())
                .toList();
        return DietLogReviewResponse.builder()
                .id(log.getId())
                .customerId(log.getCustomerId())
                .customerName(customerName)
                .customerAvatar(customerAvatar)
                .imageUrl(log.getImageUrl())
                .mealType(log.getMealType())
                .foodDescription(log.getFoodDescription())
                .aiConfidenceScore(log.getAiConfidenceScore())
                .macrosJson(log.getMacrosJson())
                .status(log.getStatus())
                .sosTicketFlag(log.getSosTicketFlag())
                .logDate(log.getLogDate())
                .createdAt(log.getCreatedAt())
                .additionalImages(additionalImages)
                .mealSource(log.getMealSource())
                .mealComplexity(log.getMealComplexity())
                .restaurantName(log.getRestaurantName())
                .recognitionSource(log.getRecognitionSource())
                .aiRawJson(log.getAiRawJson())
                .aiPredictedMacros(log.getAiPredictedMacros())
                .dbMatchedMacros(log.getDbMatchedMacros())
                .macrosAtReview(log.getMacrosAtReview())
                .ptAdjustedMacros(log.getPtAdjustedMacros())
                .ptBlindMacros(log.getPtBlindMacros())
                .dbMatchScore(log.getDbMatchScore())
                .modelVersion(log.getModelVersion())
                .matchedFoodName(log.getMatchedFoodName())
                .experimentCohort(log.getExperimentCohort())
                .ptAction(log.getPtAction())
                .ptCorrectionReason(log.getPtCorrectionReason())
                .blindSubmitted(log.getPtBlindMacros() != null)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<SosTicketResponse>> getSosTickets(UUID ptId) {
        List<SosTicketResponse> tickets = sosTicketRepository
                .findByPt_Id(ptId, PageRequest.of(0, 50, Sort.by("createdAt").descending()))
                .map(this::toSosResponse).getContent();
        return ApiResponse.success(tickets);
    }

    @Override
    @Transactional
    public ApiResponse<DietLogReviewResponse> submitBlindEstimate(UUID logId, UUID ptId, BlindEstimateRequest request) {
        DietLog dietLog = dietLogRepository.findByIdWithCustomer(logId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", logId));
        if (!mappingRepository.existsByPt_IdAndClient_Id(ptId, dietLog.getCustomerId())) {
            throw new BadRequestException("You can only estimate logs from your assigned clients");
        }
        MacroNutrients blind = MacroUtils.buildAdjustedMacroMap(
                request.getCalories(), request.getProtein(), request.getCarb(), request.getFat());
        dietLog.setPtBlindMacros(blind);
        dietLog = dietLogRepository.save(dietLog);
        return ApiResponse.success(toReviewResponse(dietLog), "Blind estimate saved");
    }

    @Override
    @Transactional
    public ApiResponse<Void> resolveSosTicket(UUID ticketId, UUID ptId, String note) {
        SosTicket ticket = sosTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("SOS Ticket", ticketId));
        if (ticket.getPtId() == null || !ticket.getPtId().equals(ptId)) {
            throw new BadRequestException("You can only resolve tickets assigned to you");
        }
        ticket.setStatus(SosTicketStatus.RESOLVED);
        if (note != null) ticket.setNote(note);
        sosTicketRepository.save(ticket);

        if (ticket.getDietLog() != null && ticket.getDietLog().getCustomerId() != null) {
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("ticketId", ticketId);
            payload.put("status", "RESOLVED");
            payload.put("note", note);
            webSocketSessionService.sendToUser(ticket.getDietLog().getCustomerId(), "SOS_RESOLVED", payload);
        }
        return ApiResponse.success(null, "SOS ticket resolved");
    }

    private SosTicketResponse toSosResponse(SosTicket ticket) {
        return SosTicketResponse.builder()
                .id(ticket.getId())
                .dietLogId(ticket.getDietLog() != null ? ticket.getDietLog().getId() : null)
                .note(ticket.getNote())
                .priority(ticket.getPriority())
                .status(ticket.getStatus())
                .reasonCode(ticket.getReasonCode())
                .mealSource(ticket.getMealSource())
                .autoCreated(ticket.getAutoCreated())
                .customerName(ticket.getDietLog() != null
                        ? userQueryService.findUserById(ticket.getDietLog().getCustomerId()).map(User::getFullName).orElse(null)
                        : null)
                .ptName(ticket.getPtId() != null
                        ? userQueryService.findUserById(ticket.getPtId()).map(User::getFullName).orElse(null)
                        : null)
                .createdAt(ticket.getCreatedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PtRblStatsDto> getRblStats(UUID ptId) {
        LocalDate start = LocalDate.now().minusMonths(1);
        LocalDate end = LocalDate.now();
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

    private void notifyClientOfReview(UUID clientId, UUID logId, String status) {
        log.info("Notifying client {} about review of log {}: status={}", clientId, logId, status);
        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("logId", logId);
        payload.put("status", status);
        webSocketSessionService.sendToUser(clientId, "DIET_LOG_REVIEWED", payload);
    }
}