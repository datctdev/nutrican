package com.sba.nutricanbe.workspace.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.exception.UnauthorizedException;
import com.sba.nutricanbe.common.util.CoachingWeeks;
import com.sba.nutricanbe.diet.util.DayPlanRules;
import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.diet.dto.request.SelfPlanSubmissionReviewRequest;
import com.sba.nutricanbe.diet.dto.response.SelfPlanItemResponse;
import com.sba.nutricanbe.diet.dto.response.SelfPlanSubmissionResponse;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.entity.MealPlanSuggestion;
import com.sba.nutricanbe.diet.entity.SelfPlanItem;
import com.sba.nutricanbe.diet.entity.SelfPlanSubmission;
import com.sba.nutricanbe.diet.entity.WeeklySummary;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealPlanItemSourceType;
import com.sba.nutricanbe.diet.enums.MealPlanSkipReason;
import com.sba.nutricanbe.diet.enums.MealPlanSuggestionStatus;
import com.sba.nutricanbe.diet.enums.SelfPlanSubmissionStatus;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanRepository;
import com.sba.nutricanbe.diet.repository.MealPlanSuggestionRepository;
import com.sba.nutricanbe.diet.repository.SelfPlanItemRepository;
import com.sba.nutricanbe.diet.repository.SelfPlanSubmissionRepository;
import com.sba.nutricanbe.diet.repository.WeeklySummaryRepository;
import com.sba.nutricanbe.user.dto.NotificationPayload;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.enums.NotificationLinkType;
import com.sba.nutricanbe.user.service.NotificationService;
import com.sba.nutricanbe.workspace.dto.MealPlanSuggestionDto;
import com.sba.nutricanbe.workspace.dto.MealPlanSuggestionReviewRequest;
import com.sba.nutricanbe.workspace.dto.WeeklySummaryDto;
import com.sba.nutricanbe.workspace.dto.WeeklySummaryRequest;
import com.sba.nutricanbe.workspace.service.PtReviewService;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import com.sba.nutricanbe.workspace.service.support.MealPlanSuggestionMapper;
import com.sba.nutricanbe.workspace.service.support.PtWorkspaceAccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PtReviewServiceImpl implements PtReviewService {

    private final MealPlanSuggestionRepository mealPlanSuggestionRepository;
    private final MealPlanItemRepository mealPlanItemRepository;
    private final MealPlanRepository mealPlanRepository;
    private final DietLogRepository dietLogRepository;
    private final SelfPlanItemRepository selfPlanItemRepository;
    private final SelfPlanSubmissionRepository selfPlanSubmissionRepository;
    private final WeeklySummaryRepository weeklySummaryRepository;
    private final NotificationService notificationService;
    private final WebSocketSessionService webSocketSessionService;
    private final PtWorkspaceAccessGuard accessGuard;
    private final MealPlanSuggestionMapper suggestionMapper;

    @Override
    @Transactional
    public ApiResponse<MealPlanSuggestionDto> reviewMealPlanSuggestion(UUID ptId, UUID suggestionId,
                                                                       MealPlanSuggestionReviewRequest request) {
        MealPlanSuggestion suggestion = mealPlanSuggestionRepository.findById(suggestionId)
                .orElseThrow(() -> new ResourceNotFoundException("MealPlanSuggestion", suggestionId));
        accessGuard.assertActiveMapping(ptId, suggestion.getCustomerId());
        if (suggestion.getStatus() != MealPlanSuggestionStatus.PENDING) {
            throw new BadRequestException("Only a pending replacement request can be reviewed");
        }
        MealPlanItem item = mealPlanItemRepository.findById(suggestion.getMealPlanItemId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "MealPlanItem", suggestion.getMealPlanItemId()));
        MealPlan plan = mealPlanRepository.findById(item.getMealPlanId())
                .orElseThrow(() -> new ResourceNotFoundException("MealPlan", item.getMealPlanId()));
        if (!ptId.equals(plan.getPtId())) {
            throw new UnauthorizedException("You can only review requests for your own meal plans");
        }
        if (item.getPlanDate().isBefore(DietDates.todayVn())) {
            suggestion.setStatus(MealPlanSuggestionStatus.EXPIRED);
            suggestion.setDecidedAt(LocalDateTime.now());
            return ApiResponse.success(suggestionMapper.toDto(mealPlanSuggestionRepository.save(suggestion)),
                    "Suggestion expired because the meal date has passed");
        }
        if (Boolean.TRUE.equals(item.getEaten()) || item.getSkipReason() != null) {
            throw new BadRequestException("The item is no longer eligible for replacement");
        }
        String action = request.getAction() != null ? request.getAction().toUpperCase() : "";
        if ("APPROVE".equals(action)) {
            suggestion.setStatus(MealPlanSuggestionStatus.APPROVED);
            if (suggestion.getSuggestedFoodCode() != null) {
                item.setFoodCode(suggestion.getSuggestedFoodCode());
            }
            if (suggestion.getSuggestedFoodName() != null) {
                item.setFreeText(suggestion.getSuggestedFoodName());
            }
            if (suggestion.getSuggestedGram() != null) {
                item.setPortionGrams(suggestion.getSuggestedGram());
            }
            item.setEaten(false);
            item.setSkipReason(null);
            item.setSkipNote(null);
            mealPlanItemRepository.save(item);
        } else if ("REJECT".equals(action)) {
            if (request.getPtNote() == null || request.getPtNote().isBlank()) {
                throw new BadRequestException("ptNote is required when rejecting a replacement request");
            }
            suggestion.setStatus(MealPlanSuggestionStatus.REJECTED);
        } else {
            throw new BadRequestException("action must be APPROVE or REJECT");
        }
        suggestion.setPtNote(request.getPtNote());
        suggestion.setDecidedAt(LocalDateTime.now());
        MealPlanSuggestion saved = mealPlanSuggestionRepository.save(suggestion);
        notificationService.notify(suggestion.getCustomerId(), NotificationPayload.builder()
                .type("MEAL_PLAN_REPLACEMENT_" + suggestion.getStatus().name())
                .title(suggestion.getStatus() == MealPlanSuggestionStatus.APPROVED
                        ? "PT đã duyệt thay món" : "PT từ chối thay món")
                .body(suggestion.getStatus() == MealPlanSuggestionStatus.APPROVED
                        ? suggestion.getSuggestedFoodName()
                        : request.getPtNote())
                .linkType(NotificationLinkType.MEAL_PLAN)
                .linkRefId(plan.getId())
                .sendEmail(false)
                .build());
        webSocketSessionService.sendToUserOnly(suggestion.getCustomerId(), "MEAL_PLAN_REPLACEMENT_UPDATED",
                Map.of(
                        "suggestionId", suggestion.getId(),
                        "status", suggestion.getStatus().name(),
                        "mealPlanItemId", suggestion.getMealPlanItemId()));
        return ApiResponse.success(suggestionMapper.toDto(saved), "Suggestion updated");
    }

    @Override
    @Transactional
    public ApiResponse<List<MealPlanSuggestionDto>> getPendingMealPlanSuggestions(UUID ptId, UUID clientId) {
        accessGuard.assertActiveMapping(ptId, clientId);
        return ApiResponse.success(mealPlanSuggestionRepository
                .findByCustomerIdAndStatus(clientId, MealPlanSuggestionStatus.PENDING)
                .stream()
                .filter(suggestion -> isSuggestionOwnedByPt(suggestion, ptId))
                .map(this::expireSuggestionIfStale)
                .filter(suggestion -> suggestion.getStatus() == MealPlanSuggestionStatus.PENDING)
                .map(suggestionMapper::toDto)
                .toList());
    }

    @Override
    @Transactional
    public ApiResponse<WeeklySummaryDto> createWeeklySummary(UUID ptId, WeeklySummaryRequest request) {
        if (request.getClientId() == null || request.getWeekStartDate() == null) {
            throw new BadRequestException("Thiếu học viên hoặc ngày bắt đầu tuần coaching");
        }
        PtClientMapping mapping = accessGuard.requireActiveMapping(ptId, request.getClientId());
        LocalDate todayVn = DietDates.todayVn();
        CoachingWeeks.Window current = CoachingWeeks.from(mapping.getCoachingStartedAt(), todayVn);
        if (!current.available()) {
            throw new BadRequestException("Chưa bắt đầu coaching — không thể tạo tổng kết tuần");
        }
        LocalDate weekStart = request.getWeekStartDate();
        LocalDate weekEnd = weekStart.plusDays(6);
        if (!CoachingWeeks.canSubmitSummary(mapping.getCoachingStartedAt(), weekStart, todayVn)) {
            LocalDate coachingStart = mapping.getCoachingStartedAt().toLocalDate();
            long offsetDays = ChronoUnit.DAYS.between(coachingStart, weekStart);
            if (weekStart.isBefore(coachingStart) || offsetDays % 7 != 0) {
                throw new BadRequestException(
                        "Ngày bắt đầu tuần phải trùng biên tuần coaching (tính từ ngày bắt đầu tập với PT, mỗi 7 ngày)");
            }
            throw new BadRequestException(
                    "Tuần coaching chưa kết thúc. Ngày cuối tuần là "
                            + weekEnd.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                            + " — chỉ gửi từ ngày hôm sau.");
        }

        WeeklySummary summary = weeklySummaryRepository
                .findByPtIdAndClientIdAndWeekStartDate(ptId, request.getClientId(), weekStart)
                .orElseGet(() -> WeeklySummary.builder()
                        .ptId(ptId)
                        .clientId(request.getClientId())
                        .mappingId(mapping.getId())
                        .weekStartDate(weekStart)
                        .build());
        summary.setSummaryText(request.getSummaryText());
        summary.setAdherenceRate(request.getAdherenceRate());
        summary.setNextPlanNote(request.getNextPlanNote());
        if (summary.getMappingId() == null) {
            summary.setMappingId(mapping.getId());
        }

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
    public ApiResponse<List<SelfPlanSubmissionResponse>> listPendingSelfPlanSubmissions(UUID ptId) {
        List<SelfPlanSubmissionResponse> result = selfPlanSubmissionRepository
                .findByPtIdAndStatusOrderBySubmittedAtDesc(ptId, SelfPlanSubmissionStatus.PENDING)
                .stream()
                .map(s -> SelfPlanSubmissionResponse.from(s, reviewableSubmissionItems(s.getId())
                        .stream().map(SelfPlanItemResponse::from).toList()))
                .filter(s -> s.getItems() != null && !s.getItems().isEmpty())
                .toList();
        return ApiResponse.success(result);
    }

    @Override
    @Transactional
    public ApiResponse<SelfPlanSubmissionResponse> reviewSelfPlanSubmission(
            UUID ptId, UUID submissionId, SelfPlanSubmissionReviewRequest request) {
        SelfPlanSubmission submission = selfPlanSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("SelfPlanSubmission", submissionId));
        accessGuard.assertActiveMapping(ptId, submission.getCustomerId());
        if (!ptId.equals(submission.getPtId())) {
            throw new UnauthorizedException("Bạn không có quyền duyệt yêu cầu này");
        }
        if (submission.getStatus() != SelfPlanSubmissionStatus.PENDING) {
            throw new BadRequestException("Chỉ có thể duyệt yêu cầu đang chờ");
        }
        List<SelfPlanItem> items = selfPlanItemRepository.findBySubmissionId(submissionId);
        List<SelfPlanItem> reviewableItems = reviewableSubmissionItems(submissionId);
        if (reviewableItems.isEmpty()) {
            throw new BadRequestException("Không còn buổi nào cần duyệt — học viên có thể đã ăn / buổi đã chốt");
        }
        String action = request.getAction() != null ? request.getAction().toUpperCase() : "";

        if ("REJECT".equals(action)) {
            if (request.getPtNote() == null || request.getPtNote().isBlank()) {
                throw new BadRequestException("ptNote là bắt buộc khi từ chối");
            }
            items.forEach(item -> item.setLockedByReview(false));
            selfPlanItemRepository.saveAll(items);
            submission.setStatus(SelfPlanSubmissionStatus.REJECTED);
        } else if ("APPROVE".equals(action)) {
            applySelfPlanSubmission(submission, reviewableItems);
            submission.setStatus(SelfPlanSubmissionStatus.APPROVED);
        } else {
            throw new BadRequestException("action phải là APPROVE hoặc REJECT");
        }
        submission.setPtNote(request.getPtNote());
        submission.setDecidedAt(LocalDateTime.now());
        submission.setPendingUniqueKey(null);
        SelfPlanSubmission saved = selfPlanSubmissionRepository.save(submission);

        notificationService.notify(submission.getCustomerId(), NotificationPayload.builder()
                .type("SELF_PLAN_" + submission.getStatus().name())
                .title(submission.getStatus() == SelfPlanSubmissionStatus.APPROVED
                        ? "PT đã duyệt kế hoạch tự chọn" : "PT từ chối kế hoạch tự chọn")
                .body(submission.getStatus() == SelfPlanSubmissionStatus.APPROVED
                        ? "Ngày " + submission.getPlanDate()
                        : request.getPtNote())
                .linkType(NotificationLinkType.MEAL_PLAN)
                .linkRefId(submission.getCustomerId())
                .sendEmail(false)
                .build());

        return ApiResponse.success(SelfPlanSubmissionResponse.from(saved,
                reviewableItems.stream().map(SelfPlanItemResponse::from).toList()));
    }

    private boolean isSuggestionOwnedByPt(MealPlanSuggestion suggestion, UUID ptId) {
        return mealPlanItemRepository.findById(suggestion.getMealPlanItemId())
                .flatMap(item -> mealPlanRepository.findById(item.getMealPlanId()))
                .map(plan -> ptId.equals(plan.getPtId()))
                .orElse(false);
    }

    private MealPlanSuggestion expireSuggestionIfStale(MealPlanSuggestion suggestion) {
        MealPlanItem item = mealPlanItemRepository.findById(suggestion.getMealPlanItemId()).orElse(null);
        if (item != null && item.getPlanDate().isBefore(DietDates.todayVn())) {
            suggestion.setStatus(MealPlanSuggestionStatus.EXPIRED);
            suggestion.setDecidedAt(LocalDateTime.now());
            return mealPlanSuggestionRepository.save(suggestion);
        }
        return suggestion;
    }

    private List<SelfPlanItem> reviewableSubmissionItems(UUID submissionId) {
        List<SelfPlanItem> items = selfPlanItemRepository.findBySubmissionId(submissionId);
        if (items.isEmpty()) {
            return items;
        }
        SelfPlanSubmission submission = selfPlanSubmissionRepository.findById(submissionId).orElse(null);
        if (submission == null) {
            return items.stream()
                    .filter(item -> !Boolean.TRUE.equals(item.getEaten()))
                    .toList();
        }
        LocalDate planDate = submission.getPlanDate();
        UUID customerId = submission.getCustomerId();
        List<MealPlanItem> ptItems = mealPlanRepository
                .findByClientIdAndIsPublishedTrueOrderByWeekStartDesc(customerId).stream()
                .filter(p -> {
                    LocalDate start = p.getWeekStart();
                    if (start == null) return false;
                    LocalDate end = start.plusDays(6);
                    return !planDate.isBefore(start) && !planDate.isAfter(end);
                })
                .findFirst()
                .map(plan -> mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId())
                        .stream()
                        .filter(i -> planDate.equals(i.getPlanDate()))
                        .toList())
                .orElse(List.of());
        List<DietLog> logs = dietLogRepository.findByCustomerIdAndLogDate(customerId, planDate).stream()
                .filter(log -> log.getStatus() == DietLogStatus.LOGGED)
                .toList();
        List<SelfPlanItem> allDaySelfItems = selfPlanItemRepository
                .findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(customerId, planDate);
        return items.stream()
                .filter(item -> !Boolean.TRUE.equals(item.getEaten()))
                .filter(item -> isReviewableSubmissionItem(planDate, item, ptItems, allDaySelfItems, logs))
                .toList();
    }


    private boolean isReviewableSubmissionItem(
            LocalDate planDate,
            SelfPlanItem item,
            List<MealPlanItem> ptItems,
            List<SelfPlanItem> submissionItems,
            List<DietLog> logs) {
        if (item.getMealPeriod() == null) {
            return true;
        }
        return !DayPlanRules.isMealPeriodSettled(
                planDate, item.getMealPeriod(), ptItems, submissionItems, logs);
    }

    private void applySelfPlanSubmission(SelfPlanSubmission submission, List<SelfPlanItem> items) {
        if (items.isEmpty()) {
            return;
        }
        List<DietLog> dayLogs = dietLogRepository.findByCustomerIdAndLogDate(
                submission.getCustomerId(), submission.getPlanDate()).stream()
                .filter(log -> log.getStatus() == DietLogStatus.LOGGED)
                .toList();
        MealPlan plan = mealPlanRepository
                .findByClientIdAndIsPublishedTrueOrderByWeekStartDesc(submission.getCustomerId())
                .stream()
                .filter(p -> {
                    LocalDate start = p.getWeekStart();
                    if (start == null) return false;
                    LocalDate end = start.plusDays(6);
                    return !submission.getPlanDate().isBefore(start) && !submission.getPlanDate().isAfter(end);
                })
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Không tìm thấy thực đơn PT đang áp dụng cho ngày này"));

        Map<MealPeriod, List<SelfPlanItem>> byPeriod = items.stream()
                .filter(i -> i.getMealPeriod() != null)
                .collect(Collectors.groupingBy(SelfPlanItem::getMealPeriod));
        if (byPeriod.isEmpty()) {
            throw new BadRequestException("Self plan items thiếu khung giờ (mealPeriod)");
        }

        for (Map.Entry<MealPeriod, List<SelfPlanItem>> entry : byPeriod.entrySet()) {
            MealPeriod period = entry.getKey();
            List<MealPlanItem> oldItems = mealPlanItemRepository.findByMealPlanIdAndPlanDateAndMealPeriod(
                    plan.getId(), submission.getPlanDate(), period);
            for (MealPlanItem oldItem : oldItems) {
                List<MealPlanSuggestion> pending = mealPlanSuggestionRepository
                        .findByMealPlanItemIdAndStatus(oldItem.getId(), MealPlanSuggestionStatus.PENDING);
                pending.forEach(s -> {
                    s.setStatus(MealPlanSuggestionStatus.CANCELLED);
                    s.setDecidedAt(LocalDateTime.now());
                });
                mealPlanSuggestionRepository.saveAll(pending);
            }
            if (!oldItems.isEmpty()) {
                for (MealPlanItem oldItem : oldItems) {
                    if (oldItem.getSourceType() == MealPlanItemSourceType.SELF_OVERRIDE) {
                        continue;
                    }
                    oldItem.setSkipReason(MealPlanSkipReason.SUPERSEDED);
                    oldItem.setSkipNote("Thay bằng đề xuất học viên đã duyệt");
                    oldItem.setEaten(false);
                    mealPlanItemRepository.save(oldItem);
                }
            }
            List<MealPlanItem> newItems = entry.getValue().stream()
                    .map(selfItem -> {
                        DietLog matchedLog = findMatchingLog(selfItem, dayLogs);
                        boolean hasLoggedPeriod = dayLogs.stream().anyMatch(log ->
                                selfItem.getMealPeriod() != null && selfItem.getMealPeriod().equals(log.getMealPeriod()));
                        return MealPlanItem.builder()
                                .mealPlanId(plan.getId())
                                .planDate(selfItem.getPlanDate())
                                .mealType(selfItem.getMealType())
                                .mealPeriod(selfItem.getMealPeriod())
                                .freeText(selfItem.getItemName())
                                .portionGrams(selfItem.getQuantityG())
                                .eaten(Boolean.TRUE.equals(selfItem.getEaten()) || matchedLog != null)
                                .note(matchedLog == null && hasLoggedPeriod
                                        ? "ALREADY_LOGGED"
                                        : null)
                                .sourceType(MealPlanItemSourceType.SELF_OVERRIDE)
                                .foodItemId(selfItem.getFoodItemId())
                                .build();
                    })
                    .toList();
            mealPlanItemRepository.saveAll(newItems);
        }

        items.forEach(item -> {
            item.setApplied(true);
            item.setLockedByReview(false);
        });
        selfPlanItemRepository.saveAll(items);
    }

    private DietLog findMatchingLog(SelfPlanItem selfItem, List<DietLog> dayLogs) {
        if (selfItem == null || selfItem.getMealPeriod() == null) {
            return null;
        }
        return dayLogs.stream()
                .filter(log -> selfItem.getMealPeriod().equals(log.getMealPeriod()))
                .filter(log -> matchesSelfPlanItem(selfItem, log))
                .findFirst()
                .orElse(null);
    }

    private boolean matchesSelfPlanItem(SelfPlanItem selfItem, DietLog log) {
        if (selfItem.getFoodItemId() != null && log.getFoodItemId() != null) {
            return selfItem.getFoodItemId().equals(log.getFoodItemId());
        }
        if (selfItem.getFoodItemId() != null || log.getFoodItemId() != null) {
            return false;
        }
        String left = normalizeFoodLabel(selfItem.getItemName());
        String right = normalizeFoodLabel(log.getFoodDescription());
        if (left == null || right == null || !left.equals(right)) {
            return false;
        }
        return withinTolerance(selfItem.getCalories(), log.getMacrosJson() != null ? log.getMacrosJson().calories() : null, 0.10, 30)
                && withinTolerance(selfItem.getProtein(), log.getMacrosJson() != null ? log.getMacrosJson().protein() : null, 0.15, 5)
                && withinTolerance(selfItem.getCarb(), log.getMacrosJson() != null ? log.getMacrosJson().carbs() : null, 0.15, 5)
                && withinTolerance(selfItem.getFat(), log.getMacrosJson() != null ? log.getMacrosJson().fat() : null, 0.15, 5);
    }

    private String normalizeFoodLabel(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value
                .replaceAll("\\s*\\((MORNING|NOON|AFTERNOON|EVENING|LATE)\\)\\s*$", "")
                .trim()
                .toLowerCase();
        return normalized.isEmpty() ? null : normalized;
    }

    private boolean withinTolerance(BigDecimal expected, BigDecimal actual, double pct, int absolute) {
        if (expected == null || actual == null) {
            return false;
        }
        BigDecimal diff = expected.subtract(actual).abs();
        BigDecimal pctTolerance = expected.abs().multiply(BigDecimal.valueOf(pct));
        BigDecimal allowed = pctTolerance.min(BigDecimal.valueOf(absolute));
        return diff.compareTo(allowed) <= 0;
    }
}
