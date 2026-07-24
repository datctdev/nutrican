package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ConflictException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.diet.util.DayPlanRules;
import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.common.util.MealPeriodLabels;
import com.sba.nutricanbe.common.util.MealPeriods;
import com.sba.nutricanbe.diet.dto.request.CreateDietLogRequest;
import com.sba.nutricanbe.diet.dto.request.DietLogItemRequest;
import com.sba.nutricanbe.diet.dto.request.SelfPlanItemRequest;
import com.sba.nutricanbe.diet.dto.request.SelfPlanItemUpdateRequest;
import com.sba.nutricanbe.diet.dto.response.DietLogResponse;
import com.sba.nutricanbe.diet.dto.response.SelfPlanItemResponse;
import com.sba.nutricanbe.diet.dto.response.SelfPlanSubmissionResponse;
import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.SelfPlanItem;
import com.sba.nutricanbe.diet.entity.SelfPlanSubmission;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.enums.SelfPlanSubmissionStatus;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.repository.SelfPlanItemRepository;
import com.sba.nutricanbe.diet.repository.SelfPlanSubmissionRepository;
import com.sba.nutricanbe.diet.service.DayPlanService;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.diet.service.DietLogService;
import com.sba.nutricanbe.diet.service.SelfPlanService;
import com.sba.nutricanbe.user.dto.NotificationPayload;
import com.sba.nutricanbe.user.enums.NotificationLinkType;
import com.sba.nutricanbe.user.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SelfPlanServiceImpl implements SelfPlanService {

    private final SelfPlanItemRepository selfPlanItemRepository;
    private final SelfPlanSubmissionRepository selfPlanSubmissionRepository;
    private final FoodItemRepository foodItemRepository;
    private final MealPlanItemRepository mealPlanItemRepository;
    private final DietLogRepository dietLogRepository;
    private final DietLogHelper dietLogHelper;
    private final DietLogService dietLogService;
    private final DayPlanService dayPlanService;
    private final NotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public List<SelfPlanItemResponse> list(UUID customerId, LocalDate date) {
        LocalDate planDate = date != null ? date : DietDates.todayVn();
        return selfPlanItemRepository
                .findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(customerId, planDate)
                .stream()
                .map(SelfPlanItemResponse::from)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public SelfPlanItemResponse create(UUID customerId, SelfPlanItemRequest request) {
        MealPeriod mealPeriod = request.getMealPeriod();
        MealType mealType = request.getMealType();
        if (mealPeriod != null) {
            mealType = MealPeriods.toMealType(mealPeriod);
        } else if (mealType != null) {
            mealPeriod = MealPeriods.deriveFromMealType(mealType);
        }
        if (mealType == null) {
            throw new BadRequestException("mealPeriod or mealType is required");
        }
        if (request.getFoodItemId() == null) {
            throw new BadRequestException("foodItemId is required");
        }
        LocalDate planDate = DietDates.resolvePlanDate(request.getPlanDate());
        if (mealPeriod != null) {
            assertPeriodMutable(customerId, planDate, mealPeriod);
        }
        FoodItem food = foodItemRepository.findById(request.getFoodItemId())
                .orElseThrow(() -> new ResourceNotFoundException("FoodItem", request.getFoodItemId()));
        BigDecimal qty = request.getQuantityG() != null && request.getQuantityG().compareTo(BigDecimal.ZERO) > 0
                ? request.getQuantityG()
                : (food.getServingSizeG() != null ? food.getServingSizeG() : BigDecimal.valueOf(100));
        MacroNutrients macros = dietLogHelper.macrosForFood(food, qty);

        SelfPlanItem item = SelfPlanItem.builder()
                .customerId(customerId)
                .planDate(planDate)
                .mealType(mealType)
                .mealPeriod(mealPeriod)
                .foodItemId(food.getId())
                .itemName(food.getNameVi())
                .quantityG(qty)
                .calories(macros.calories())
                .protein(macros.protein())
                .carb(macros.carbs())
                .fat(macros.fat())
                .eaten(false)
                .build();
        return SelfPlanItemResponse.from(selfPlanItemRepository.save(item));
    }

    @Override
    @Transactional
    public SelfPlanItemResponse update(UUID customerId, UUID id, SelfPlanItemUpdateRequest request) {
        SelfPlanItem item = requireOwned(customerId, id);
        assertPlanDateMutable(item.getPlanDate());
        assertPeriodMutable(customerId, item.getPlanDate(), item.getMealPeriod());
        if (Boolean.TRUE.equals(item.getLockedByReview())) {
            throw new ConflictException("Món này đang chờ PT duyệt, không thể sửa");
        }
        if (Boolean.TRUE.equals(item.getEaten())) {
            throw new BadRequestException("Không thể sửa món đã đánh dấu đã ăn");
        }
        if (request.getMealPeriod() != null) {
            assertPeriodMutable(customerId, item.getPlanDate(), request.getMealPeriod());
            item.setMealPeriod(request.getMealPeriod());
            item.setMealType(MealPeriods.toMealType(request.getMealPeriod()));
        } else if (request.getMealType() != null) {
            item.setMealType(request.getMealType());
            MealPeriod derived = MealPeriods.deriveFromMealType(request.getMealType());
            if (derived != null) {
                item.setMealPeriod(derived);
            }
        }
        if (request.getQuantityG() != null) {
            if (request.getQuantityG().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BadRequestException("quantityG must be positive");
            }
            item.setQuantityG(request.getQuantityG());
            if (item.getFoodItemId() != null) {
                foodItemRepository.findById(item.getFoodItemId()).ifPresent(food -> {
                    MacroNutrients macros = dietLogHelper.macrosForFood(food, request.getQuantityG());
                    item.setCalories(macros.calories());
                    item.setProtein(macros.protein());
                    item.setCarb(macros.carbs());
                    item.setFat(macros.fat());
                });
            } else {
                rescaleFromBase100(item, request.getQuantityG());
            }
        }
        return SelfPlanItemResponse.from(selfPlanItemRepository.save(item));
    }

    @Override
    @Transactional
    public void delete(UUID customerId, UUID id) {
        SelfPlanItem item = requireOwned(customerId, id);
        assertPlanDateMutable(item.getPlanDate());
        assertPeriodMutable(customerId, item.getPlanDate(), item.getMealPeriod());
        if (Boolean.TRUE.equals(item.getLockedByReview())) {
            throw new ConflictException("Món này đang chờ PT duyệt, không thể xóa");
        }
        if (Boolean.TRUE.equals(item.getEaten())) {
            throw new BadRequestException("Không thể xóa món đã đánh dấu đã ăn");
        }
        selfPlanItemRepository.delete(item);
    }

    @Override
    @Transactional
    public DietLogResponse markEaten(UUID customerId, UUID id, String lateTickReason) {
        if (dietLogHelper.hasActivePt(customerId)) {
            throw new BadRequestException("Gửi PT duyệt trước; ghi nhật ký sau khi được duyệt");
        }
        SelfPlanItem item = requireOwned(customerId, id);
        assertPlanDateMutable(item.getPlanDate());
        if (Boolean.TRUE.equals(item.getEaten())) {
            throw new BadRequestException("Món này đã được ghi nhận ăn rồi");
        }
        if (item.getMealPeriod() == null) {
            throw new BadRequestException("Món plan thiếu khung giờ; sửa/thêm lại món");
        }
        if (!MealPeriods.isMealPeriodOpen(item.getPlanDate(), item.getMealPeriod())) {
            if (!allowLateTick(item.getPlanDate(), item.getMealPeriod(), lateTickReason)) {
                throw new BadRequestException("Chỉ đánh dấu đã ăn trong khung giờ của buổi đó");
            }
        }
        DietDates.resolveLogDate(item.getPlanDate());

        CreateDietLogRequest logReq = new CreateDietLogRequest();
        logReq.setMealType(item.getMealType());
        logReq.setMealPeriod(item.getMealPeriod());
        logReq.setLogDate(item.getPlanDate());
        logReq.setMealSource(MealSource.HOME_COOKED);
        logReq.setFoodDescription(item.getItemName());
        logReq.setFoodItemId(item.getFoodItemId());
        logReq.setSendToPt(false);
        logReq.setLateTickReason(normalizeLateTickReason(lateTickReason));

        DietLogItemRequest line = new DietLogItemRequest();
        line.setFoodItemId(item.getFoodItemId());
        line.setItemName(item.getItemName());
        line.setQuantityG(item.getQuantityG());
        line.setCalories(item.getCalories());
        line.setProtein(item.getProtein());
        line.setCarb(item.getCarb());
        line.setFat(item.getFat());
        logReq.setItems(List.of(line));

        DietLogResponse created = dietLogService.createLog(customerId, logReq).getData();
        item.setEaten(true);
        item.setDietLogId(created.getId());
        selfPlanItemRepository.save(item);
        return created;
    }

    @Override
    @Transactional
    public SelfPlanSubmissionResponse submit(UUID customerId, LocalDate date) {
        LocalDate planDate = date != null ? date : DietDates.todayVn();
        if (planDate.isBefore(DietDates.todayVn())) {
            throw new BadRequestException("Không thể gửi duyệt cho ngày trong quá khứ");
        }
        MealPlan plan = dayPlanService.getPublishedPlanForDate(customerId, planDate)
                .orElseThrow(() -> new BadRequestException(
                        "Ngày này PT chưa lên thực đơn, không thể gửi duyệt"));
        if (!dietLogHelper.hasActivePt(customerId)) {
            throw new BadRequestException("Bạn cần có PT đang đồng hành để gửi duyệt kế hoạch tự chọn");
        }

        List<SelfPlanItem> allDayItems = selfPlanItemRepository
                .findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(customerId, planDate);
        List<MealPlanItem> ptItems = loadPtItemsForDate(customerId, planDate);
        List<DietLog> logs = dietLogRepository.findByCustomerIdAndLogDate(customerId, planDate);
        java.util.Set<UUID> rejectedSubmissionIds = selfPlanSubmissionRepository
                .findByCustomerIdAndPlanDate(customerId, planDate)
                .stream()
                .filter(s -> s.getStatus() == SelfPlanSubmissionStatus.REJECTED)
                .map(SelfPlanSubmission::getId)
                .collect(Collectors.toSet());

        List<SelfPlanItem> items = allDayItems.stream()
                .filter(i -> !Boolean.TRUE.equals(i.getEaten()))
                .filter(i -> !Boolean.TRUE.equals(i.getApplied()))
                .filter(i -> !Boolean.TRUE.equals(i.getLockedByReview()))
                .filter(i -> i.getSubmissionId() == null || !rejectedSubmissionIds.contains(i.getSubmissionId()))
                .filter(i -> i.getMealPeriod() == null
                        || !DayPlanRules.isMealPeriodSettled(planDate, i.getMealPeriod(), ptItems, allDayItems, logs))
                .toList();
        if (items.isEmpty()) {
            throw new BadRequestException("Không có món đề xuất mới để gửi duyệt");
        }

        UUID ptId = plan.getPtId();
        Map<MealPeriod, List<SelfPlanItem>> byPeriod = new EnumMap<>(MealPeriod.class);
        List<SelfPlanItem> unscopedItems = new ArrayList<>();
        for (SelfPlanItem item : items) {
            if (item.getMealPeriod() == null) {
                unscopedItems.add(item);
            } else {
                byPeriod.computeIfAbsent(item.getMealPeriod(), k -> new ArrayList<>()).add(item);
            }
        }
        List<SelfPlanItem> savedItems = new ArrayList<>();
        SelfPlanSubmission primarySubmission = null;

        for (Map.Entry<MealPeriod, List<SelfPlanItem>> entry : byPeriod.entrySet()) {
            SelfPlanSubmission submission = lockItemsIntoSubmission(
                    customerId, planDate, ptId, entry.getKey(), entry.getValue(), allDayItems, savedItems);
            if (primarySubmission == null) {
                primarySubmission = submission;
            }
        }
        if (!unscopedItems.isEmpty()) {
            SelfPlanSubmission submission = lockItemsIntoSubmission(
                    customerId, planDate, ptId, null, unscopedItems, allDayItems, savedItems);
            if (primarySubmission == null) {
                primarySubmission = submission;
            }
        }

        return SelfPlanSubmissionResponse.from(primarySubmission,
                savedItems.stream().map(SelfPlanItemResponse::from).toList());
    }

    private SelfPlanSubmission lockItemsIntoSubmission(
            UUID customerId,
            LocalDate planDate,
            UUID ptId,
            MealPeriod period,
            List<SelfPlanItem> periodItems,
            List<SelfPlanItem> allDayItems,
            List<SelfPlanItem> savedItems) {
        Optional<SelfPlanSubmission> existing = period != null
                ? findPendingSubmissionForPeriod(customerId, planDate, period, allDayItems)
                : findPendingUnscopedSubmission(customerId, planDate, allDayItems);
        boolean appended = existing.isPresent();
        SelfPlanSubmission submission = existing.orElseGet(() -> createPendingSubmission(
                customerId, planDate, ptId, periodItems));

        periodItems.forEach(item -> {
            item.setLockedByReview(true);
            item.setSubmissionId(submission.getId());
        });
        savedItems.addAll(selfPlanItemRepository.saveAll(periodItems));

        if (appended) {
            submission.setSubmittedAt(LocalDateTime.now());
            selfPlanSubmissionRepository.save(submission);
        }
        notifyPtSelfPlanSubmitted(ptId, customerId, planDate, periodItems, appended);
        return submission;
    }

    private Optional<SelfPlanSubmission> findPendingUnscopedSubmission(
            UUID customerId, LocalDate planDate, List<SelfPlanItem> allDayItems) {
        UUID submissionId = allDayItems.stream()
                .filter(i -> i.getMealPeriod() == null)
                .filter(i -> Boolean.TRUE.equals(i.getLockedByReview()))
                .map(SelfPlanItem::getSubmissionId)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
        if (submissionId == null) {
            return Optional.empty();
        }
        return selfPlanSubmissionRepository.findById(submissionId)
                .filter(s -> customerId.equals(s.getCustomerId()))
                .filter(s -> planDate.equals(s.getPlanDate()))
                .filter(s -> s.getStatus() == SelfPlanSubmissionStatus.PENDING);
    }

    private Optional<SelfPlanSubmission> findPendingSubmissionForPeriod(
            UUID customerId,
            LocalDate planDate,
            MealPeriod period,
            List<SelfPlanItem> allDayItems) {
        UUID submissionId = allDayItems.stream()
                .filter(i -> period.equals(i.getMealPeriod()))
                .filter(i -> Boolean.TRUE.equals(i.getLockedByReview()))
                .map(SelfPlanItem::getSubmissionId)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
        if (submissionId == null) {
            return Optional.empty();
        }
        return selfPlanSubmissionRepository.findById(submissionId)
                .filter(s -> customerId.equals(s.getCustomerId()))
                .filter(s -> planDate.equals(s.getPlanDate()))
                .filter(s -> s.getStatus() == SelfPlanSubmissionStatus.PENDING);
    }

    private SelfPlanSubmission createPendingSubmission(
            UUID customerId, LocalDate planDate, UUID ptId, List<SelfPlanItem> periodItems) {
        String pendingKey = buildPendingUniqueKey(customerId, planDate, periodItems);
        try {
            return selfPlanSubmissionRepository.saveAndFlush(SelfPlanSubmission.builder()
                    .customerId(customerId)
                    .ptId(ptId)
                    .planDate(planDate)
                    .status(SelfPlanSubmissionStatus.PENDING)
                    .submittedAt(LocalDateTime.now())
                    .pendingUniqueKey(pendingKey)
                    .build());
        } catch (DataIntegrityViolationException e) {
            List<SelfPlanItem> dayItems = selfPlanItemRepository
                    .findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(customerId, planDate);
            MealPeriod period = periodItems.stream()
                    .map(SelfPlanItem::getMealPeriod)
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElse(null);
            Optional<SelfPlanSubmission> existing = period != null
                    ? findPendingSubmissionForPeriod(customerId, planDate, period, dayItems)
                    : findPendingUnscopedSubmission(customerId, planDate, dayItems);
            return existing.orElseThrow(() -> new ConflictException(
                    "Đã gửi đề xuất cho buổi này — chờ PT duyệt hoặc hủy gửi trước"));
        }
    }

    private void notifyPtSelfPlanSubmitted(
            UUID ptId, UUID customerId, LocalDate planDate, List<SelfPlanItem> items, boolean appended) {
        notificationService.notify(ptId, NotificationPayload.builder()
                .type("SELF_PLAN_SUBMITTED")
                .title(appended ? "Học viên bổ sung đề xuất tự chọn" : "Học viên gửi kế hoạch tự chọn để duyệt")
                .body("Ngày " + planDate + describeSubmittedPeriods(items))
                .linkType(NotificationLinkType.MEAL_PLAN)
                .linkRefId(customerId)
                .sendEmail(false)
                .build());
    }

    @Override
    @Transactional
    public SelfPlanSubmissionResponse cancel(UUID customerId, UUID submissionId) {
        SelfPlanSubmission submission = selfPlanSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("SelfPlanSubmission", submissionId));
        if (!submission.getCustomerId().equals(customerId)) {
            throw new ResourceNotFoundException("SelfPlanSubmission", submissionId);
        }
        if (submission.getStatus() != SelfPlanSubmissionStatus.PENDING) {
            throw new BadRequestException("Chỉ có thể hủy yêu cầu đang chờ duyệt");
        }
        submission.setStatus(SelfPlanSubmissionStatus.CANCELLED);
        submission.setDecidedAt(LocalDateTime.now());
        submission.setPendingUniqueKey(null);
        SelfPlanSubmission saved = selfPlanSubmissionRepository.save(submission);

        List<SelfPlanItem> items = selfPlanItemRepository.findBySubmissionId(submissionId);
        items.forEach(item -> {
            item.setLockedByReview(false);
            item.setSubmissionId(null);
        });
        List<SelfPlanItem> savedItems = selfPlanItemRepository.saveAll(items);

        return SelfPlanSubmissionResponse.from(saved,
                savedItems.stream().map(SelfPlanItemResponse::from).toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SelfPlanSubmissionResponse> listSubmissions(
            UUID customerId, LocalDate date, SelfPlanSubmissionStatus status) {
        List<SelfPlanSubmission> submissions;
        if (date != null && status != null) {
            submissions = selfPlanSubmissionRepository
                    .findByCustomerIdAndPlanDateAndStatus(customerId, date, status)
                    .map(List::of)
                    .orElse(List.of());
        } else if (date != null) {
            submissions = selfPlanSubmissionRepository.findByCustomerIdAndPlanDate(customerId, date);
        } else if (status != null) {
            submissions = selfPlanSubmissionRepository
                    .findByCustomerIdAndStatusOrderBySubmittedAtDesc(customerId, status);
        } else {
            submissions = selfPlanSubmissionRepository.findByCustomerIdOrderBySubmittedAtDesc(customerId);
        }
        return submissions.stream()
                .map(s -> SelfPlanSubmissionResponse.from(s,
                        selfPlanItemRepository.findBySubmissionId(s.getId()).stream()
                                .map(SelfPlanItemResponse::from)
                                .toList()))
                .toList();
    }

    private SelfPlanItem requireOwned(UUID customerId, UUID id) {
        SelfPlanItem item = selfPlanItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SelfPlanItem", id));
        if (!item.getCustomerId().equals(customerId)) {
            throw new ResourceNotFoundException("SelfPlanItem", id);
        }
        return item;
    }

    private void assertPlanDateMutable(LocalDate planDate) {
        if (planDate != null && planDate.isBefore(DietDates.todayVn())) {
            throw new BadRequestException("Ngày đã qua — không thể chỉnh sửa kế hoạch");
        }
    }


    private String buildPendingUniqueKey(UUID customerId, LocalDate planDate, List<SelfPlanItem> items) {
        String periods = items.stream()
                .map(SelfPlanItem::getMealPeriod)
                .filter(Objects::nonNull)
                .distinct()
                .sorted(java.util.Comparator.comparing(Enum::name))
                .map(Enum::name)
                .collect(Collectors.joining(","));
        if (periods.isEmpty()) {
            periods = "UNSCOPED";
        }
        return customerId + "|" + planDate + "|" + periods;
    }

    private String describeSubmittedPeriods(List<SelfPlanItem> items) {
        String periods = items.stream()
                .map(SelfPlanItem::getMealPeriod)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .sorted(java.util.Comparator.comparing(Enum::name))
                .map(MealPeriodLabels::labelVi)
                .collect(Collectors.joining(", "));
        return periods.isBlank() ? "" : " · " + periods;
    }

    private void assertPeriodMutable(UUID customerId, LocalDate planDate, MealPeriod mealPeriod) {
        if (planDate == null || mealPeriod == null) {
            return;
        }
        List<MealPlanItem> ptItems = loadPtItemsForDate(customerId, planDate);
        List<SelfPlanItem> selfItems = selfPlanItemRepository
                .findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(customerId, planDate);
        List<DietLog> logs = dietLogRepository.findByCustomerIdAndLogDate(customerId, planDate);
        if (DayPlanRules.isMealPeriodSettled(planDate, mealPeriod, ptItems, selfItems, logs)) {
            throw new BadRequestException("Buổi này đã chốt — không thể chỉnh sửa đề xuất");
        }
    }

    private List<MealPlanItem> loadPtItemsForDate(UUID customerId, LocalDate planDate) {
        return dayPlanService.getPublishedPlanForDate(customerId, planDate)
                .map(plan -> mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId())
                        .stream()
                        .filter(i -> planDate.equals(i.getPlanDate()))
                        .toList())
                .orElse(List.of());
    }

    private boolean allowLateTick(LocalDate planDate, MealPeriod mealPeriod, String lateTickReason) {
        String normalized = normalizeLateTickReason(lateTickReason);
        if (normalized == null || planDate == null || mealPeriod == null) {
            return false;
        }
        if (!planDate.equals(DietDates.todayVn())) {
            return false;
        }
        return MealPeriods.isPastPeriodForLateTick(mealPeriod);
    }

    private String normalizeLateTickReason(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.length() < 10) {
            throw new BadRequestException("lateTickReason phải có ít nhất 10 ký tự");
        }
        return trimmed;
    }

    private void rescaleFromBase100(SelfPlanItem item, BigDecimal newQty) {
        BigDecimal oldQty = item.getQuantityG() != null && item.getQuantityG().compareTo(BigDecimal.ZERO) > 0
                ? item.getQuantityG()
                : BigDecimal.valueOf(100);
        BigDecimal ratio = newQty.divide(oldQty, 6, RoundingMode.HALF_UP);
        if (item.getCalories() != null) {
            item.setCalories(item.getCalories().multiply(ratio).setScale(2, RoundingMode.HALF_UP));
        }
        if (item.getProtein() != null) {
            item.setProtein(item.getProtein().multiply(ratio).setScale(2, RoundingMode.HALF_UP));
        }
        if (item.getCarb() != null) {
            item.setCarb(item.getCarb().multiply(ratio).setScale(2, RoundingMode.HALF_UP));
        }
        if (item.getFat() != null) {
            item.setFat(item.getFat().multiply(ratio).setScale(2, RoundingMode.HALF_UP));
        }
    }
}
