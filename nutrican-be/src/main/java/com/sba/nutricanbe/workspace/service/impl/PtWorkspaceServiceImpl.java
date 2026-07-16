package com.sba.nutricanbe.workspace.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.exception.UnauthorizedException;

import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.entity.SosTicket;
import com.sba.nutricanbe.diet.entity.DietLogFeedback;
import com.sba.nutricanbe.diet.entity.MealPlanSuggestion;
import com.sba.nutricanbe.diet.entity.WeeklySummary;
import com.sba.nutricanbe.diet.enums.MealPlanSuggestionStatus;
import com.sba.nutricanbe.diet.repository.DietLogFeedbackRepository;
import com.sba.nutricanbe.diet.repository.MealPlanSuggestionRepository;
import com.sba.nutricanbe.diet.repository.WeeklySummaryRepository;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanRepository;
import com.sba.nutricanbe.user.entity.MacroTarget;
import com.sba.nutricanbe.user.dto.MacroTargetRequest;
import com.sba.nutricanbe.user.dto.MacroTargetResponse;
import com.sba.nutricanbe.user.service.UserProfileService;
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
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.PtCorrectionReason;
import com.sba.nutricanbe.diet.enums.PtReviewAction;
import com.sba.nutricanbe.diet.enums.SosTicketStatus;
import com.sba.nutricanbe.diet.dto.SosTicketResponse;
import com.sba.nutricanbe.common.util.MacroUtils;
import com.sba.nutricanbe.common.util.RblDatasetFilter;
import com.sba.nutricanbe.common.util.RblMetricsUtil;
import com.sba.nutricanbe.workspace.dto.*;
import com.sba.nutricanbe.workspace.entity.MealPlanTemplate;
import com.sba.nutricanbe.workspace.entity.MealPlanTemplateItem;
import com.sba.nutricanbe.workspace.repository.MealPlanTemplateItemRepository;
import com.sba.nutricanbe.workspace.repository.MealPlanTemplateRepository;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
    private final MealPlanRepository mealPlanRepository;
    private final MealPlanItemRepository mealPlanItemRepository;
    private final MealPlanSuggestionRepository mealPlanSuggestionRepository;
    private final WeeklySummaryRepository weeklySummaryRepository;
    private final DietLogFeedbackRepository dietLogFeedbackRepository;
    private final com.sba.nutricanbe.user.service.ProgressTimelineService progressTimelineService;
    private final UserProfileService userProfileService;
    private final com.sba.nutricanbe.diet.service.IntakeControlLoopService intakeControlLoopService;
    private final com.sba.nutricanbe.diet.service.DietLogService dietLogService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final MealPlanTemplateRepository mealPlanTemplateRepository;
    private final MealPlanTemplateItemRepository mealPlanTemplateItemRepository;

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<ClientStatusDto>> getClients(UUID ptId, int page, int size, String statusFilter) {
        Pageable pageable = PageRequest.of(page, size);
        Page<PtClientMapping> mappings;

        if (statusFilter != null) {
            if ("ACTIVE".equalsIgnoreCase(statusFilter)) {
                mappings = mappingRepository.findByPt_IdAndStatusIn(
                        ptId, List.of(ClientMappingStatus.ACTIVE, ClientMappingStatus.END_REQUESTED), pageable);
            } else {
                mappings = mappingRepository.findByPtIdAndStatusWithPagination(
                        ptId, ClientMappingStatus.valueOf(statusFilter), pageable);
            }
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

        Page<DietLog> logPage = dietLogRepository.findByCustomerIdInAndReviewStatus(
                clientIds, DietLogReviewStatus.PENDING, pageable);

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

        if (!mappingRepository.existsByPt_IdAndClient_IdAndStatus(ptId, dietLog.getCustomerId(), ClientMappingStatus.ACTIVE)) {
            throw new BadRequestException("You can only review logs from your active clients");
        }

        dietLog.setPtReviewerId(ptId);
        dietLog.setMacrosAtReview(MacroUtils.copyMacroMap(dietLog.getMacrosJson()));
        PtCorrectionReason reason = request.getCorrectionReason() != null
                ? request.getCorrectionReason() : PtCorrectionReason.OTHER;
        dietLog.setPtCorrectionReason(reason);
        dietLog.setPtReviewedAt(LocalDateTime.now());

        switch (request.getAction().toUpperCase()) {
            case "APPROVE" -> {
                dietLog.setStatus(DietLogStatus.LOGGED);
                dietLog.setReviewStatus(DietLogReviewStatus.APPROVED);
                dietLog.setPtAction(PtReviewAction.APPROVE);
                dietLog.setPtAdjustedMacros(MacroUtils.copyMacroMap(dietLog.getMacrosAtReview()));
                if (request.getNote() != null) dietLog.setPtNote(request.getNote());
            }
            case "ADJUST", "ADJUST_MACROS" -> {
                dietLog.setStatus(DietLogStatus.LOGGED);
                dietLog.setReviewStatus(DietLogReviewStatus.APPROVED);
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
                dietLog.setStatus(DietLogStatus.LOGGED);
                dietLog.setReviewStatus(DietLogReviewStatus.REJECTED);
                dietLog.setPtAction(PtReviewAction.REJECT);
                dietLog.setPtAdjustedMacros(null);
                dietLog.setPtNote(request.getNote());
            }
            default -> throw new BadRequestException("Invalid action: " + request.getAction());
        }

        dietLog = dietLogRepository.save(dietLog);
        log.info("Diet log {} reviewed by PT {}: action={}", logId, ptId, request.getAction());

        notifyClientOfReview(dietLog.getCustomerId(), logId, dietLog.getReviewStatus().name());

        return ApiResponse.success(toReviewResponse(dietLog), "Log reviewed successfully");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<ProgressDataDto> getClientProgress(UUID ptId, UUID clientId, LocalDate startDate, LocalDate endDate) {
        requirePtClientDataAccess(ptId, clientId);
        if (startDate == null) startDate = LocalDate.now().minusMonths(1);
        if (endDate == null) endDate = LocalDate.now();

        List<DietLog> logs = dietLogRepository.findByCustomerIdAndLogDateBetween(
                clientId, startDate, endDate, PageRequest.of(0, 1000)).getContent();

        List<BodyMetric> metrics = bodyMetricRepository.findByUserIdAndDateRange(clientId, startDate, endDate);

        MacroTarget macroTarget = userQueryService.findMacroTargetByUserId(clientId).orElse(null);
        BigDecimal calorieTarget = macroTarget != null && macroTarget.getDailyCalories() != null
                ? macroTarget.getDailyCalories() : BigDecimal.valueOf(2000);

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
                        .target(calorieTarget)
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
        BigDecimal mealPlanAdherence = computeMealPlanAdherence(clientId);
        if (logCount > 0) {
            BigDecimal adherence = BigDecimal.valueOf(logCount)
                    .divide(BigDecimal.valueOf(Math.max(calorieData.size(), 1)), 2, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            macroSummary = ProgressDataDto.MacroSummary.builder()
                    .avgCalories(totalCalories.divide(BigDecimal.valueOf(logCount), 1, RoundingMode.HALF_UP))
                    .avgProtein(totalProtein.divide(BigDecimal.valueOf(logCount), 1, RoundingMode.HALF_UP))
                    .avgCarb(totalCarb.divide(BigDecimal.valueOf(logCount), 1, RoundingMode.HALF_UP))
                    .avgFat(totalFat.divide(BigDecimal.valueOf(logCount), 1, RoundingMode.HALF_UP))
                    .adherenceRate(adherence)
                    .mealPlanAdherenceRate(mealPlanAdherence)
                    .build();
        } else if (mealPlanAdherence != null) {
            macroSummary = ProgressDataDto.MacroSummary.builder()
                    .mealPlanAdherenceRate(mealPlanAdherence)
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

        progressTimelineService.enrichProgress(response, clientId, startDate, endDate);
        enrichMealPlanAndFeedback(response, clientId, startDate, endDate, logs);

        return ApiResponse.success(response);
    }

    private void enrichMealPlanAndFeedback(ProgressDataDto response, UUID clientId,
                                           LocalDate startDate, LocalDate endDate, List<DietLog> logs) {
        List<MealPlanSkipItemDto> skips = new ArrayList<>();
        mealPlanRepository.findByClientIdOrderByWeekStartDesc(clientId).stream().findFirst()
                .ifPresent(plan -> mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId())
                        .stream()
                        .filter(i -> i.getSkipReason() != null)
                        .forEach(i -> skips.add(MealPlanSkipItemDto.builder()
                                .itemId(i.getId())
                                .planDate(i.getPlanDate())
                                .mealType(i.getMealType() != null ? i.getMealType().name() : null)
                                .foodLabel(i.getFreeText() != null ? i.getFreeText() : i.getFoodCode())
                                .skipReason(i.getSkipReason().name())
                                .skipNote(i.getSkipNote())
                                .build())));
        response.setSkipReasons(skips);

        List<MealPlanSuggestionDto> pending = mealPlanSuggestionRepository
                .findByCustomerIdAndStatus(clientId, MealPlanSuggestionStatus.PENDING)
                .stream().map(this::toSuggestionDto).toList();
        response.setPendingSuggestions(pending);

        response.setWeeklySummaries(weeklySummaryRepository.findByClientIdOrderByWeekStartDateDesc(clientId)
                .stream().limit(8).map(ws -> WeeklySummaryDto.builder()
                        .id(ws.getId())
                        .weekStartDate(ws.getWeekStartDate())
                        .summaryText(ws.getSummaryText())
                        .adherenceRate(ws.getAdherenceRate())
                        .nextPlanNote(ws.getNextPlanNote())
                        .build()).toList());

        if (logs.isEmpty()) {
            response.setPostMealAggregate(List.of());
            return;
        }
        List<UUID> logIds = logs.stream().map(DietLog::getId).toList();
        Map<UUID, DietLogFeedback> feedbackByLog = new HashMap<>();
        dietLogFeedbackRepository.findByDietLogIdIn(logIds).forEach(f -> feedbackByLog.put(f.getDietLogId(), f));
        Map<LocalDate, List<DietLogFeedback>> byWeek = new HashMap<>();
        for (DietLog log : logs) {
            DietLogFeedback fb = feedbackByLog.get(log.getId());
            if (fb == null || fb.getEnergyRating() == null) {
                continue;
            }
            LocalDate weekStart = log.getLogDate().with(java.time.DayOfWeek.MONDAY);
            byWeek.computeIfAbsent(weekStart, k -> new ArrayList<>()).add(fb);
        }
        List<PostMealWeekAggregateDto> aggregates = byWeek.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> {
                    List<DietLogFeedback> fbs = e.getValue();
                    double avgE = fbs.stream().mapToInt(DietLogFeedback::getEnergyRating).average().orElse(0);
                    double avgH = fbs.stream()
                            .filter(f -> f.getHungerAfterRating() != null)
                            .mapToInt(DietLogFeedback::getHungerAfterRating)
                            .average().orElse(0);
                    return PostMealWeekAggregateDto.builder()
                            .weekStart(e.getKey())
                            .avgEnergy(BigDecimal.valueOf(avgE).setScale(1, RoundingMode.HALF_UP))
                            .avgHunger(BigDecimal.valueOf(avgH).setScale(1, RoundingMode.HALF_UP))
                            .sampleCount(fbs.size())
                            .build();
                }).toList();
        response.setPostMealAggregate(aggregates);
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
                : dietLogRepository.findByCustomerIdInAndReviewStatus(clientIds, DietLogReviewStatus.PENDING, PageRequest.of(0, 1)).getTotalElements();
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
                .mappingStatus(mapping.getStatus() != null ? mapping.getStatus().name() : null)
                .endRequestedBy(mapping.getEndRequestedBy() != null ? mapping.getEndRequestedBy().name() : null)
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
        String resolutionNote = note != null ? note.trim() : "";
        if (resolutionNote.length() < 20) {
            throw new BadRequestException("resolutionNote must be at least 20 characters");
        }
        ticket.setStatus(SosTicketStatus.RESOLVED);
        ticket.setResolutionNote(resolutionNote);
        ticket.setResolvedAt(LocalDateTime.now());
        sosTicketRepository.save(ticket);

        if (ticket.getDietLog() != null && ticket.getDietLog().getCustomerId() != null) {
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("ticketId", ticketId);
            payload.put("status", "RESOLVED");
            payload.put("resolutionNote", resolutionNote);
            webSocketSessionService.sendToUser(ticket.getDietLog().getCustomerId(), "SOS_RESOLVED", payload);
        }
        return ApiResponse.success(null, "SOS ticket resolved");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<com.sba.nutricanbe.chat.dto.ChatContextSummaryDto> getChatContext(UUID ptId, UUID clientId) {
        if (!mappingRepository.existsByPt_IdAndClient_IdAndStatus(ptId, clientId, ClientMappingStatus.ACTIVE)) {
            throw new BadRequestException("No active mapping for this client");
        }
        LocalDate today = LocalDate.now();
        var summary = dietLogService.getSummary(clientId, today).getData();
        return ApiResponse.success(com.sba.nutricanbe.chat.dto.ChatContextSummaryDto.builder()
                .date(today)
                .calories(summary != null ? summary.getTotalCalories() : null)
                .protein(summary != null ? summary.getTotalProtein() : null)
                .carbs(summary != null ? summary.getTotalCarbs() : null)
                .fat(summary != null ? summary.getTotalFat() : null)
                .calorieTarget(summary != null ? summary.getTargetCalories() : null)
                .intakeStatus(summary != null && summary.getIntakeStatus() != null
                        ? summary.getIntakeStatus().name() : null)
                .build());
    }

    private SosTicketResponse toSosResponse(SosTicket ticket) {
        return SosTicketResponse.builder()
                .id(ticket.getId())
                .dietLogId(ticket.getDietLog() != null ? ticket.getDietLog().getId() : null)
                .note(ticket.getNote())
                .resolutionNote(ticket.getResolutionNote())
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
                .assignedAt(ticket.getAssignedAt())
                .firstResponseAt(ticket.getFirstResponseAt())
                .resolvedAt(ticket.getResolvedAt())
                .slaBreached(ticket.getSlaBreached())
                .escalationCount(ticket.getEscalationCount())
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

    @Override
    @Transactional
    public ApiResponse<MacroTargetResponse> setClientMacroTarget(UUID ptId, UUID clientId, MacroTargetRequest request) {
        if (!mappingRepository.existsByPt_IdAndClient_IdAndStatus(ptId, clientId, ClientMappingStatus.ACTIVE)) {
            throw new BadRequestException("Client not active for this PT");
        }
        return userProfileService.setMacroTarget(clientId, request);
    }

    private BigDecimal computeMealPlanAdherence(UUID clientId) {
        return mealPlanRepository.findByClientIdOrderByWeekStartDesc(clientId).stream().findFirst()
                .map(plan -> {
                    List<MealPlanItem> items = mealPlanItemRepository
                            .findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId());
                    if (items.isEmpty()) {
                        return null;
                    }
                    long eaten = items.stream().filter(i -> Boolean.TRUE.equals(i.getEaten())).count();
                    return BigDecimal.valueOf(eaten * 100.0 / items.size())
                            .setScale(1, RoundingMode.HALF_UP);
                })
                .orElse(null);
    }

    private void notifyClientOfReview(UUID clientId, UUID logId, String status) {
        log.info("Notifying client {} about review of log {}: status={}", clientId, logId, status);
        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("logId", logId);
        payload.put("status", status);
        webSocketSessionService.sendToUser(clientId, "DIET_LOG_REVIEWED", payload);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<PtClientAlertDto>> getClientAlerts(UUID ptId) {
        // 1. Get existing diet violations
        List<PtClientAlertDto> alerts = new java.util.ArrayList<>(
                intakeControlLoopService.getActiveAlertsForPt(ptId)
        );

        // 2. Get active clients mapped to this PT
        List<com.sba.nutricanbe.user.entity.PtClientMapping> activeMappings = mappingRepository.findByPtIdWithClients(ptId).stream()
                .filter(m -> m.getStatus() == com.sba.nutricanbe.user.enums.ClientMappingStatus.ACTIVE)
                .toList();

        LocalDate today = LocalDate.now();
        LocalDate thisMonday = today.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));

        for (com.sba.nutricanbe.user.entity.PtClientMapping mapping : activeMappings) {
            User client = mapping.getClient();

            // 3. Check Plan Expired (đến hạn đổi thực đơn)
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
                            .reason("Đến hạn đổi thực đơn tuần mới (Thực đơn hiện tại từ ngày " + latestPlan.getWeekStart() + ")")
                            .logDate(today)
                            .alertType("PLAN_EXPIRED")
                            .build());
                }
            }

            // 4. Check Weight Changed today (vừa cập nhật cân nặng)
            java.util.Optional<com.sba.nutricanbe.user.entity.BodyMetric> metricTodayOpt = 
                    bodyMetricRepository.findByUser_IdAndRecordDate(client.getId(), today);
            if (metricTodayOpt.isPresent()) {
                com.sba.nutricanbe.user.entity.BodyMetric metric = metricTodayOpt.get();
                alerts.add(PtClientAlertDto.builder()
                        .clientId(client.getId())
                        .clientName(client.getFullName())
                        .reason("Vừa cập nhật cân nặng mới: " + metric.getWeight() + " kg" 
                                + (metric.getBodyFatPercent() != null ? " (Tỷ lệ mỡ: " + metric.getBodyFatPercent() + "%)" : ""))
                        .logDate(today)
                        .alertType("WEIGHT_CHANGED")
                        .build());
            }
        }

        return ApiResponse.success(alerts);
    }

    @Override
    @Transactional
    public ApiResponse<MealPlanSuggestionDto> reviewMealPlanSuggestion(UUID ptId, UUID suggestionId,
                                                                     MealPlanSuggestionReviewRequest request) {
        MealPlanSuggestion suggestion = mealPlanSuggestionRepository.findById(suggestionId)
                .orElseThrow(() -> new ResourceNotFoundException("MealPlanSuggestion", suggestionId));
        assertActiveMapping(ptId, suggestion.getCustomerId());
        String action = request.getAction() != null ? request.getAction().toUpperCase() : "";
        if ("APPROVE".equals(action)) {
            suggestion.setStatus(MealPlanSuggestionStatus.APPROVED);
            mealPlanItemRepository.findById(suggestion.getMealPlanItemId()).ifPresent(item -> {
                if (suggestion.getSuggestedFoodCode() != null) {
                    item.setFoodCode(suggestion.getSuggestedFoodCode());
                }
                if (suggestion.getSuggestedFoodName() != null) {
                    item.setFreeText(suggestion.getSuggestedFoodName());
                }
                if (suggestion.getSuggestedGram() != null) {
                    item.setPortionGrams(suggestion.getSuggestedGram());
                }
                item.setSkipReason(null);
                item.setSkipNote(null);
                mealPlanItemRepository.save(item);
            });
        } else if ("REJECT".equals(action)) {
            suggestion.setStatus(MealPlanSuggestionStatus.REJECTED);
        } else {
            throw new BadRequestException("action must be APPROVE or REJECT");
        }
        suggestion.setPtNote(request.getPtNote());
        return ApiResponse.success(toSuggestionDto(mealPlanSuggestionRepository.save(suggestion)), "Suggestion updated");
    }

    @Override
    @Transactional
    public ApiResponse<WeeklySummaryDto> createWeeklySummary(UUID ptId, WeeklySummaryRequest request) {
        if (request.getClientId() == null || request.getWeekStartDate() == null) {
            throw new BadRequestException("clientId and weekStartDate required");
        }
        assertActiveMapping(ptId, request.getClientId());
        WeeklySummary summary = WeeklySummary.builder()
                .ptId(ptId)
                .clientId(request.getClientId())
                .weekStartDate(request.getWeekStartDate())
                .summaryText(request.getSummaryText())
                .adherenceRate(request.getAdherenceRate())
                .nextPlanNote(request.getNextPlanNote())
                .build();
        WeeklySummary saved = weeklySummaryRepository.save(summary);
        WeeklySummaryDto dto = WeeklySummaryDto.builder()
                .id(saved.getId())
                .weekStartDate(saved.getWeekStartDate())
                .summaryText(saved.getSummaryText())
                .adherenceRate(saved.getAdherenceRate())
                .nextPlanNote(saved.getNextPlanNote())
                .build();
        webSocketSessionService.sendToUser(request.getClientId(), "WEEKLY_SUMMARY", dto);
        return ApiResponse.success(dto, "Weekly summary saved");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<MealPlanSuggestionDto>> getPendingMealPlanSuggestions(UUID ptId, UUID clientId) {
        assertActiveMapping(ptId, clientId);
        return ApiResponse.success(mealPlanSuggestionRepository
                .findByCustomerIdAndStatus(clientId, MealPlanSuggestionStatus.PENDING)
                .stream().map(this::toSuggestionDto).toList());
    }

    private MealPlanSuggestionDto toSuggestionDto(MealPlanSuggestion s) {
        return MealPlanSuggestionDto.builder()
                .id(s.getId())
                .mealPlanItemId(s.getMealPlanItemId())
                .suggestedFoodCode(s.getSuggestedFoodCode())
                .suggestedFoodName(s.getSuggestedFoodName())
                .suggestedGram(s.getSuggestedGram())
                .status(s.getStatus() != null ? s.getStatus().name() : null)
                .build();
    }

    private void assertActiveMapping(UUID ptId, UUID clientId) {
        if (!mappingRepository.existsByPt_IdAndClient_IdAndStatus(ptId, clientId, ClientMappingStatus.ACTIVE)) {
            throw new BadRequestException("Client not active for this PT");
        }
    }

    private void requirePtClientDataAccess(UUID ptId, UUID clientId) {
        PtClientMapping mapping = mappingRepository.findByPt_IdAndClient_Id(ptId, clientId)
                .orElseThrow(() -> new BadRequestException("No mapping with this client"));
        if (mapping.getStatus() == ClientMappingStatus.INACTIVE
                || mapping.getStatus() == ClientMappingStatus.PENDING) {
            throw new UnauthorizedException("No access to this client data");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PtClientProfileDto> getClientProfile(UUID ptId, UUID clientId) {
        assertActiveMapping(ptId, clientId);
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client", clientId));

        java.util.Optional<BodyMetric> metricOpt = bodyMetricRepository.findTopByUserIdOrderByRecordDateDesc(clientId);
        java.math.BigDecimal weight = metricOpt.map(BodyMetric::getWeight).orElse(null);
        java.math.BigDecimal bodyFat = metricOpt.map(BodyMetric::getBodyFatPercent).orElse(null);

        java.math.BigDecimal tdee = (client.getMacroTarget() != null) ? client.getMacroTarget().getDailyCalories() : null;

        java.math.BigDecimal protein = (client.getMacroTarget() != null) ? client.getMacroTarget().getProtein() : null;
        java.math.BigDecimal carb = (client.getMacroTarget() != null) ? client.getMacroTarget().getCarb() : null;
        java.math.BigDecimal fat = (client.getMacroTarget() != null) ? client.getMacroTarget().getFat() : null;

        return ApiResponse.success(PtClientProfileDto.builder()
                .clientId(client.getId())
                .fullName(client.getFullName())
                .email(client.getEmail())
                .phoneNumber(client.getPhoneNumber())
                .heightCm(client.getHeightCm())
                .gender(client.getGender())
                .dateOfBirth(client.getDateOfBirth())
                .weight(weight)
                .bodyFatPercent(bodyFat)
                .tdee(tdee)
                .allergyNotes(client.getAllergyNotes())
                .dietPreference(client.getDietPreference())
                .specialNotes(client.getAddress())
                .nutritionGoal(client.getNutritionGoal())
                .protein(protein)
                .carb(carb)
                .fat(fat)
                .build());
    }

    @Override
    @Transactional
    public ApiResponse<PtClientProfileDto> updateClientProfile(UUID ptId, UUID clientId, PtClientProfileDto request) {
        assertActiveMapping(ptId, clientId);
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client", clientId));

        if (request.getFullName() != null) client.setFullName(request.getFullName());
        if (request.getPhoneNumber() != null) client.setPhoneNumber(request.getPhoneNumber());
        if (request.getHeightCm() != null) client.setHeightCm(request.getHeightCm());
        if (request.getGender() != null) client.setGender(request.getGender());
        if (request.getDateOfBirth() != null) client.setDateOfBirth(request.getDateOfBirth());
        if (request.getAllergyNotes() != null) client.setAllergyNotes(request.getAllergyNotes());
        if (request.getDietPreference() != null) client.setDietPreference(request.getDietPreference());
        if (request.getSpecialNotes() != null) client.setAddress(request.getSpecialNotes());

        userRepository.save(client);

        LocalDate today = LocalDate.now();
        if (request.getWeight() != null) {
            BodyMetric metric = bodyMetricRepository
                    .findByUser_IdAndRecordDate(client.getId(), today)
                    .orElseGet(() -> BodyMetric.builder()
                            .user(client)
                            .recordDate(today)
                            .build());
            metric.setWeight(request.getWeight());
            if (request.getBodyFatPercent() != null) {
                metric.setBodyFatPercent(request.getBodyFatPercent());
            }
            bodyMetricRepository.save(metric);
        }

        if (request.getTdee() != null) {
            MacroTargetRequest macroReq = new MacroTargetRequest();
            macroReq.setDailyCalories(request.getTdee());
            java.math.BigDecimal t = request.getTdee();
            macroReq.setProtein(t.multiply(new java.math.BigDecimal("0.30")).divide(new java.math.BigDecimal("4.0"), 2, java.math.RoundingMode.HALF_UP));
            macroReq.setCarb(t.multiply(new java.math.BigDecimal("0.40")).divide(new java.math.BigDecimal("4.0"), 2, java.math.RoundingMode.HALF_UP));
            macroReq.setFat(t.multiply(new java.math.BigDecimal("0.30")).divide(new java.math.BigDecimal("9.0"), 2, java.math.RoundingMode.HALF_UP));
            userProfileService.setMacroTarget(client.getId(), macroReq);
        }

        return getClientProfile(ptId, clientId);
    }

    @Override
    @Transactional
    public ApiResponse<PtClientProfileDto> createClient(UUID ptId, CreateClientRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email này đã được đăng ký trong hệ thống");
        }

        User client = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode("NutriCan123@")) // Default password for PT-created clients
                .fullName(request.getFullName())
                .phoneNumber(request.getPhoneNumber())
                .heightCm(request.getHeightCm())
                .gender(request.getGender())
                .dateOfBirth(request.getDateOfBirth())
                .allergyNotes(request.getAllergyNotes())
                .dietPreference(request.getDietPreference() != null ? request.getDietPreference() : com.sba.nutricanbe.user.enums.DietPreference.NORMAL)
                .address(request.getSpecialNotes())
                .role(com.sba.nutricanbe.common.enums.UserRole.CUSTOMER)
                .status(com.sba.nutricanbe.common.enums.UserStatus.ACTIVE)
                .passwordSetRequired(true)
                .onboardingStep(1)
                .build();

        client = userRepository.save(client);

        User pt = userRepository.findById(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT", ptId));

        PtClientMapping mapping = PtClientMapping.builder()
                .pt(pt)
                .client(client)
                .status(ClientMappingStatus.ACTIVE)
                .build();
        mappingRepository.save(mapping);

        if (request.getTdee() != null) {
            MacroTargetRequest macroReq = new MacroTargetRequest();
            macroReq.setDailyCalories(request.getTdee());
            java.math.BigDecimal t = request.getTdee();
            macroReq.setProtein(t.multiply(new java.math.BigDecimal("0.30")).divide(new java.math.BigDecimal("4.0"), 2, java.math.RoundingMode.HALF_UP));
            macroReq.setCarb(t.multiply(new java.math.BigDecimal("0.40")).divide(new java.math.BigDecimal("4.0"), 2, java.math.RoundingMode.HALF_UP));
            macroReq.setFat(t.multiply(new java.math.BigDecimal("0.30")).divide(new java.math.BigDecimal("9.0"), 2, java.math.RoundingMode.HALF_UP));
            userProfileService.setMacroTarget(client.getId(), macroReq);
        }

        if (request.getWeight() != null) {
            BodyMetric metric = BodyMetric.builder()
                    .user(client)
                    .recordDate(LocalDate.now())
                    .weight(request.getWeight())
                    .bodyFatPercent(request.getBodyFatPercent())
                    .build();
            bodyMetricRepository.save(metric);
        }

        return getClientProfile(ptId, client.getId());
    }

    @Override
    @Transactional
    public ApiResponse<TemplateResponse> saveAsTemplate(UUID ptId, CreateTemplateRequest request) {
        MealPlanTemplate template = MealPlanTemplate.builder()
                .ptId(ptId)
                .name(request.getName())
                .description(request.getDescription())
                .build();
        template = mealPlanTemplateRepository.save(template);

        if (request.getItems() != null) {
            for (CreateTemplateRequest.TemplateItemDto dto : request.getItems()) {
                MealPlanTemplateItem item = MealPlanTemplateItem.builder()
                        .templateId(template.getId())
                        .dayOffset(dto.getDayOffset())
                        .mealType(com.sba.nutricanbe.diet.enums.MealType.valueOf(dto.getMealType()))
                        .foodCode(dto.getFoodCode())
                        .freeText(dto.getFreeText())
                        .portionGrams(dto.getPortionGrams())
                        .build();
                mealPlanTemplateItemRepository.save(item);
            }
        }
        
        return ApiResponse.success(TemplateResponse.builder()
                .id(template.getId())
                .name(template.getName())
                .description(template.getDescription())
                .createdAt(template.getCreatedAt() != null ? template.getCreatedAt().toString() : java.time.LocalDateTime.now().toString())
                .build());
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<TemplateResponse>> getTemplatesByPt(UUID ptId) {
        List<TemplateResponse> list = mealPlanTemplateRepository.findByPtIdOrderByCreatedAtDesc(ptId).stream()
                .map(t -> TemplateResponse.builder()
                        .id(t.getId())
                        .name(t.getName())
                        .description(t.getDescription())
                        .createdAt(t.getCreatedAt() != null ? t.getCreatedAt().toString() : null)
                        .build())
                .toList();
        return ApiResponse.success(list);
    }

    @Override
    @Transactional
    public ApiResponse<Void> applyTemplateToClient(UUID ptId, UUID templateId, UUID clientId, ApplyTemplateRequest request) {
        assertActiveMapping(ptId, clientId);
        LocalDate weekStart = LocalDate.parse(request.getWeekStart());
        
        List<MealPlanTemplateItem> templateItems = mealPlanTemplateItemRepository.findByTemplateIdOrderByDayOffsetAscMealTypeAsc(templateId);
        
        // Find or create MealPlan for the given week
        MealPlan plan = mealPlanRepository.findByClientIdOrderByWeekStartDesc(clientId).stream()
                .filter(p -> p.getWeekStart().equals(weekStart))
                .findFirst()
                .orElseGet(() -> {
                    MealPlan newPlan = MealPlan.builder()
                            .clientId(clientId)
                            .weekStart(weekStart)
                            .build();
                    return mealPlanRepository.save(newPlan);
                });
                
        // OVERRIDE: Delete existing items for that plan
        mealPlanItemRepository.deleteByMealPlanId(plan.getId());
        
        for (MealPlanTemplateItem tItem : templateItems) {
            LocalDate planDate = weekStart.plusDays(tItem.getDayOffset());
            MealPlanItem item = MealPlanItem.builder()
                    .mealPlanId(plan.getId())
                    .planDate(planDate)
                    .mealType(tItem.getMealType())
                    .foodCode(tItem.getFoodCode())
                    .freeText(tItem.getFreeText())
                    .portionGrams(tItem.getPortionGrams())
                    .build();
            mealPlanItemRepository.save(item);
        }
        
        return ApiResponse.success(null, "Template applied successfully");
    }
}
