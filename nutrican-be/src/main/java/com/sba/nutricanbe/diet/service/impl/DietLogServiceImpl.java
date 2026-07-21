package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.DietLogImage;
import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.user.entity.MacroTarget;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.ExperimentCohort;
import com.sba.nutricanbe.diet.enums.MealComplexity;
import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.RecognitionSource;
import com.sba.nutricanbe.common.util.RblCohortUtil;
import com.sba.nutricanbe.user.enums.DietPreference;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.diet.repository.DietLogImageRepository;
import com.sba.nutricanbe.diet.repository.DietLogItemRepository;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.user.service.UserQueryService;
import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.common.util.MacroUtils;
import com.sba.nutricanbe.common.util.MealPeriods;
import com.sba.nutricanbe.diet.dto.request.CreateDietLogRequest;
import com.sba.nutricanbe.diet.dto.response.DietLogResponse;
import com.sba.nutricanbe.diet.dto.response.DietSummaryResponse;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.diet.dto.response.IntakeControlResult;
import com.sba.nutricanbe.diet.enums.IntakeStatus;
import com.sba.nutricanbe.diet.service.DietLogService;
import com.sba.nutricanbe.diet.service.IntakeControlLoopService;
import com.sba.nutricanbe.diet.service.DietPrefCheckService;
import com.sba.nutricanbe.infrastructure.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.sba.nutricanbe.common.dto.MacroNutrients;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DietLogServiceImpl implements DietLogService {

    /** Dual-state: only {@link DietLogStatus#LOGGED} counts toward daily summary; PT review uses reviewStatus. */
    private static final Set<DietLogStatus> SUMMARY_STATUSES = Set.of(DietLogStatus.LOGGED);
    private final DietLogRepository dietLogRepository;
    private final DietLogImageRepository dietLogImageRepository;
    private final DietLogItemRepository dietLogItemRepository;
    private final UserQueryService userQueryService;
    private final FoodItemRepository foodItemRepository;
    private final StorageService minioService;
    private final DietLogHelper dietLogHelper;
    private final IntakeControlLoopService intakeControlLoopService;
    private final com.sba.nutricanbe.diet.service.UserRecipeService userRecipeService;
    private final DietPrefCheckService dietPrefCheckService;

    @Override
    @Transactional
    public ApiResponse<DietLogResponse> createLog(UUID customerId, CreateDietLogRequest request) {
        User customer = userQueryService.findUserById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", customerId));

        LocalDate logDate = DietDates.resolveLogDate(request.getLogDate());
        MealPeriod mealPeriod = resolveAndValidateMealPeriod(
                request.getMealPeriod(), request.getMealType(), logDate, request.getLateTickReason());
        MealType mealType = mealPeriod != null ? MealPeriods.toMealType(mealPeriod)
                : request.getMealType();
        String makeupErr = MealPeriods.validateMakeup(mealPeriod, request.getMakeupForPeriod(), logDate);
        if (makeupErr != null) {
            throw new BadRequestException(makeupErr);
        }
        MealPeriod makeup = logDate.equals(DietDates.todayVn()) ? request.getMakeupForPeriod() : null;

        MealSource mealSource = request.getMealSource() != null ? request.getMealSource() : MealSource.HOME_COOKED;
        MealComplexity mealComplexity = request.getMealComplexity() != null ? request.getMealComplexity() : MealComplexity.SIMPLE;
        boolean sendToPt = Boolean.TRUE.equals(request.getSendToPt());
        var reviewStatus = dietLogHelper.resolveReviewStatus(customerId, sendToPt);

        DietLog dietLog = DietLog.builder()
                .customerId(customerId)
                .mealType(mealType)
                .mealPeriod(mealPeriod)
                .makeupForPeriod(makeup)
                .foodDescription(request.getFoodDescription())
                .logDate(logDate)
                .status(DietLogStatus.LOGGED)
                .reviewStatus(reviewStatus)
                .mealSource(mealSource)
                .mealComplexity(mealComplexity)
                .restaurantName(request.getRestaurantName())
                .recognitionSource(RecognitionSource.MANUAL)
                .experimentCohort(ExperimentCohort.MANUAL_ENTRY)
                .foodItemId(request.getFoodItemId())
                .lateTickReason(normalizeLateTickReason(request.getLateTickReason()))
                .isPtNotified(false)
                .build();

        if (request.getRecipeId() != null) {
            var recipeItems = userRecipeService.toLogItems(customerId, request.getRecipeId());
            dietLogHelper.applyItemsToLog(dietLog, recipeItems);
            dietLog.setRecognitionSource(RecognitionSource.MANUAL_RECIPE);
            dietLog.setMealSource(MealSource.HOME_COOKED);
            dietLog.setMealComplexity(MealComplexity.HOME_COOKED_RECIPE);
        } else if (request.getItems() != null && !request.getItems().isEmpty()) {
            dietLogHelper.applyItemsToLog(dietLog, request.getItems());
            dietLog.setRecognitionSource(RecognitionSource.MANUAL);
        } else if (request.getCalories() != null) {
            MacroNutrients macros = MacroNutrients.of(request.getCalories(), request.getProtein(), request.getCarb(), request.getFat());
            dietLog.setMacrosJson(macros);
        } else if (request.getFoodItemId() != null) {
            Optional<FoodItem> foodOpt = foodItemRepository.findById(request.getFoodItemId());
            if (foodOpt.isPresent()) {
                FoodItem food = foodOpt.get();
                dietLog.setMacrosJson(dietLogHelper.macrosForFood(food, food.getServingSizeG()));
                dietLog.setFoodDescription(food.getNameVi());
            }
        }

        dietLogHelper.assignPtReviewerIfNeeded(dietLog, customerId);
        DietPreference pref = customer.getDietPreference() != null ? customer.getDietPreference() : DietPreference.NORMAL;
        dietLog.setExperimentCohortKey(RblCohortUtil.resolveKey(
                dietLog.getMealSource(), dietLog.getMealComplexity(), dietLog.getRecognitionSource(), pref));
        dietLog = dietLogRepository.save(dietLog);
        boolean pendingReview = reviewStatus == com.sba.nutricanbe.diet.enums.DietLogReviewStatus.PENDING;
        if (pendingReview) {
            dietLog.setIsPtNotified(true);
            dietLogHelper.notifyPtOfNewLog(dietLog);
        }
        log.info("Diet log created: {} by user: {}", dietLog.getId(), customerId);
        DietLogResponse response = dietLogHelper.toResponse(dietLog);
        applyManualWarnings(customerId, request, response);
        IntakeControlResult loop = intakeControlLoopService.evaluateAfterLog(
                customerId, dietLog.getLogDate(), !pendingReview);
        if (loop != null) {
            response.setIntakeStatus(loop.getIntakeStatus());
            response.setControlLoopMessage(loop.getControlLoopMessage());
            response.setSuggestSubmitToPt(loop.isSuggestSubmitToPt());
        }
        return ApiResponse.success(response, "Diet log created");
    }

    private void applyManualWarnings(UUID customerId, CreateDietLogRequest request, DietLogResponse response) {
        List<UUID> foodItemIds = new ArrayList<>();
        List<FoodItem> foods = new ArrayList<>();
        if (request.getRecipeId() != null) {
            userRecipeService.toLogItems(customerId, request.getRecipeId()).forEach(item -> {
                if (item.getFoodItemId() != null) {
                    foodItemIds.add(item.getFoodItemId());
                    foodItemRepository.findById(item.getFoodItemId()).ifPresent(foods::add);
                }
            });
        } else if (request.getItems() != null) {
            for (var item : request.getItems()) {
                if (item.getFoodItemId() != null) {
                    foodItemIds.add(item.getFoodItemId());
                    foodItemRepository.findById(item.getFoodItemId()).ifPresent(foods::add);
                }
            }
        }
        if (!foodItemIds.isEmpty()) {

        }
        if (!foods.isEmpty()) {
            var prefWarnings = dietPrefCheckService.checkFoodItems(customerId, foods);
            if (!prefWarnings.isEmpty()) {
                response.setDietPrefWarning(prefWarnings.get(0).getMessage());
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<DietLogResponse>> getLogs(UUID customerId, int page, int size,
                                                              LocalDate startDate, LocalDate endDate, String status) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<DietLog> logPage;

        if (startDate != null && endDate != null && status != null) {
            logPage = dietLogRepository.findByCustomerIdAndLogDateBetweenAndStatus(
                    customerId, startDate, endDate, DietLogStatus.valueOf(status), pageable);
        } else if (startDate != null && endDate != null) {
            logPage = dietLogRepository.findByCustomerIdAndLogDateBetween(customerId, startDate, endDate, pageable);
        } else if (status != null) {
            logPage = dietLogRepository.findByCustomerIdAndStatus(customerId, DietLogStatus.valueOf(status), pageable);
        } else {
            logPage = dietLogRepository.findByCustomerId(customerId, pageable);
        }

        return ApiResponse.success(PageResponse.from(logPage.map(dietLogHelper::toResponse)));
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<DietLogResponse> getLogById(UUID logId, UUID customerId) {
        DietLog dietLog = dietLogRepository.findByIdWithCustomer(logId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", logId));
        if (!dietLog.getCustomerId().equals(customerId)) {
            throw new BadRequestException("You can only view your own diet logs");
        }
        return ApiResponse.success(dietLogHelper.toResponse(dietLog));
    }

    @Override
    @Transactional
    public ApiResponse<DietLogResponse> updateLog(UUID logId, UUID userId, CreateDietLogRequest request) {
        DietLog dietLog = dietLogRepository.findById(logId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", logId));

        if (!dietLog.getCustomerId().equals(userId)) {
            throw new BadRequestException("You can only edit your own diet logs");
        }
        if (!isReviewSubmissionOnly(request)) {
            assertLogDateMutable(dietLog.getLogDate());
        }

        if (request.getFoodDescription() != null) dietLog.setFoodDescription(request.getFoodDescription());
        if (request.getMealType() != null) dietLog.setMealType(request.getMealType());
        if (request.getMealPeriod() != null) {
            LocalDate effectiveDate = request.getLogDate() != null
                    ? DietDates.resolveLogDate(request.getLogDate())
                    : dietLog.getLogDate();
            MealPeriod period = resolveAndValidateMealPeriod(
                    request.getMealPeriod(), request.getMealType(), effectiveDate, null);
            dietLog.setMealPeriod(period);
            if (period != null) {
                dietLog.setMealType(MealPeriods.toMealType(period));
            }
        }
        if (request.getMakeupForPeriod() != null || request.getMealPeriod() != null) {
            LocalDate effectiveDate = dietLog.getLogDate();
            MealPeriod period = dietLog.getMealPeriod();
            MealPeriod makeup = request.getMakeupForPeriod();
            String makeupErr = MealPeriods.validateMakeup(period, makeup, effectiveDate);
            if (makeupErr != null) {
                throw new BadRequestException(makeupErr);
            }
            dietLog.setMakeupForPeriod(
                    effectiveDate != null && effectiveDate.equals(DietDates.todayVn()) ? makeup : null);
        }
        if (request.getLogDate() != null) {
            LocalDate resolvedLogDate = DietDates.resolveLogDate(request.getLogDate());
            assertLogDateMutable(resolvedLogDate);
            dietLog.setLogDate(resolvedLogDate);
        }
        if (request.getLateTickReason() != null) {
            dietLog.setLateTickReason(normalizeLateTickReason(request.getLateTickReason()));
        }
        if (request.getMealSource() != null) dietLog.setMealSource(request.getMealSource());
        if (request.getMealComplexity() != null) dietLog.setMealComplexity(request.getMealComplexity());
        if (request.getRestaurantName() != null) dietLog.setRestaurantName(request.getRestaurantName());

        if (request.getCalories() != null) {
            MacroNutrients macros = MacroNutrients.of(request.getCalories(), request.getProtein(), request.getCarb(), request.getFat());
            dietLog.setMacrosJson(macros);
            dietLog.setStatus(DietLogStatus.LOGGED);
        }

        if (request.getFoodCode() != null && !request.getFoodCode().isBlank()) {
            Map<String, Object> aiRaw = dietLog.getAiRawJson() != null
                    ? new HashMap<>(dietLog.getAiRawJson())
                    : new HashMap<>();
            aiRaw.put("foodCode", request.getFoodCode());
            aiRaw.put("userConfirmed", true);
            if (request.getPortionGrams() != null) {
                aiRaw.put("userAdjustedGrams", request.getPortionGrams());
                aiRaw.put("portionSize", request.getPortionGrams());
            }
            dietLog.setAiRawJson(aiRaw);
            if (request.getFoodDescription() != null) {
                dietLog.setMatchedFoodName(request.getFoodDescription());
            }
        }
        if (request.getFoodItemId() != null) {
            dietLog.setFoodItemId(request.getFoodItemId());
        }

        boolean sendToPt = Boolean.TRUE.equals(request.getSendToPt());
        if (sendToPt) {
            var reviewStatus = dietLogHelper.resolveReviewStatus(userId, true);
            dietLog.setStatus(DietLogStatus.LOGGED);
            dietLog.setReviewStatus(reviewStatus);
            if (reviewStatus == com.sba.nutricanbe.diet.enums.DietLogReviewStatus.PENDING) {
                dietLog.setIsPtNotified(true);
                dietLogHelper.assignPtReviewerIfNeeded(dietLog, userId);
            }
        }

        dietLog = dietLogRepository.save(dietLog);
        if (dietLog.getReviewStatus() == com.sba.nutricanbe.diet.enums.DietLogReviewStatus.PENDING
                && Boolean.TRUE.equals(dietLog.getIsPtNotified())) {
            dietLogHelper.notifyPtOfNewLog(dietLog);
        }
        return ApiResponse.success(dietLogHelper.toResponse(dietLog), "Diet log updated");
    }

    @Override
    @Transactional
    public ApiResponse<DietLogResponse> submitForReview(UUID logId, UUID customerId) {
        DietLog dietLog = dietLogRepository.findById(logId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", logId));

        if (!dietLog.getCustomerId().equals(customerId)) {
            throw new BadRequestException("You can only submit your own diet logs");
        }

        if (dietLog.getStatus() != DietLogStatus.LOGGED
                && dietLog.getStatus() != DietLogStatus.DRAFT
                && dietLog.getStatus() != DietLogStatus.MANUAL_REQUIRED) {
            throw new BadRequestException("Only DRAFT, MANUAL_REQUIRED or LOGGED logs can be submitted for review");
        }

        if (!dietLogHelper.hasActivePt(customerId)) {
            throw new BadRequestException("Bạn chưa có PT");
        }

        dietLog.setStatus(DietLogStatus.LOGGED);
        dietLog.setReviewStatus(com.sba.nutricanbe.diet.enums.DietLogReviewStatus.PENDING);
        dietLog.setIsPtNotified(true);
        dietLogHelper.assignPtReviewerIfNeeded(dietLog, customerId);

        DietLog savedLog = dietLogRepository.save(dietLog);
        dietLogHelper.notifyPtOfNewLog(savedLog);

        return ApiResponse.success(dietLogHelper.toResponse(savedLog), "Log submitted for PT review");
    }

    @Override
    @Transactional
    public ApiResponse<Void> deleteLog(UUID logId, UUID userId) {
        DietLog dietLog = dietLogRepository.findById(logId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", logId));

        if (!dietLog.getCustomerId().equals(userId)) {
            throw new BadRequestException("You can only delete your own diet logs");
        }
        assertLogDateMutable(dietLog.getLogDate());

        List<DietLogImage> additionalImages = dietLogImageRepository.findByDietLogIdOrderBySortOrderAsc(logId);
        Set<String> imageObjectNames = new java.util.LinkedHashSet<>();
        if (dietLog.getImageObjectName() != null) {
            imageObjectNames.add(dietLog.getImageObjectName());
        }
        additionalImages.stream().map(DietLogImage::getImageObjectName).forEach(imageObjectNames::add);
        imageObjectNames.forEach(minioService::deleteFile);

        dietLogImageRepository.deleteAll(additionalImages);
        dietLogItemRepository.deleteByDietLogId(logId);
        dietLogRepository.delete(dietLog);

        return ApiResponse.success(null, "Diet log deleted");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<DietSummaryResponse> getSummary(UUID customerId, LocalDate date) {
        if (date == null) date = DietDates.todayVn();
        List<DietLog> logs = dietLogRepository.findByCustomerIdAndLogDate(customerId, date);

        BigDecimal totalCalories = MacroUtils.ZERO;
        BigDecimal totalProtein = MacroUtils.ZERO;
        BigDecimal totalCarb = MacroUtils.ZERO;
        BigDecimal totalFat = MacroUtils.ZERO;

        List<DietLogResponse> countableLogs = new ArrayList<>();
        for (DietLog dietLog : logs) {
            if (!SUMMARY_STATUSES.contains(dietLog.getStatus())) {
                continue;
            }
            if (dietLog.getMacrosJson() != null) {
                totalCalories = MacroUtils.add(totalCalories, dietLog.getMacrosJson().calories());
                totalProtein = MacroUtils.add(totalProtein, dietLog.getMacrosJson().protein());
                totalCarb = MacroUtils.add(totalCarb, dietLog.getMacrosJson().carbs());
                totalFat = MacroUtils.add(totalFat, dietLog.getMacrosJson().fat());
            }
            countableLogs.add(dietLogHelper.toResponse(dietLog));
        }

        MacroTarget target = userQueryService.findMacroTargetByUserId(customerId).orElse(null);

        IntakeControlResult loop = intakeControlLoopService.evaluateAfterLog(customerId, date, true);

        DietSummaryResponse summary = DietSummaryResponse.builder()
                .date(date)
                .totalCalories(totalCalories)
                .totalProtein(totalProtein)
                .totalCarbs(totalCarb)
                .totalFat(totalFat)
                .targetCalories(target != null ? target.getDailyCalories() : BigDecimal.valueOf(2000))
                .targetProtein(target != null ? target.getProtein() : BigDecimal.valueOf(120))
                .targetCarb(target != null ? target.getCarb() : BigDecimal.valueOf(200))
                .targetFat(target != null ? target.getFat() : BigDecimal.valueOf(65))
                .logs(countableLogs)
                .intakeStatus(loop != null ? loop.getIntakeStatus() : IntakeStatus.OK)
                .controlLoopMessage(loop != null ? loop.getControlLoopMessage() : null)
                .build();

        return ApiResponse.success(summary);
    }

    private void assertLogDateMutable(LocalDate logDate) {
        if (logDate != null && logDate.isBefore(DietDates.todayVn())) {
            throw new BadRequestException("Ngày đã qua — không thể sửa hoặc xoá nhật ký");
        }
    }

    /** Cho phép gửi PT duyệt log bù ngày cũ mà không sửa nội dung món. */
    private boolean isReviewSubmissionOnly(CreateDietLogRequest request) {
        if (!Boolean.TRUE.equals(request.getSendToPt())) {
            return false;
        }
        return request.getFoodDescription() == null
                && request.getMealType() == null
                && request.getMealPeriod() == null
                && request.getMakeupForPeriod() == null
                && request.getLogDate() == null
                && request.getLateTickReason() == null
                && request.getMealSource() == null
                && request.getMealComplexity() == null
                && request.getRestaurantName() == null
                && request.getCalories() == null
                && request.getProtein() == null
                && request.getCarb() == null
                && request.getFat() == null
                && request.getFoodCode() == null
                && request.getFoodItemId() == null
                && request.getPortionGrams() == null
                && request.getRecipeId() == null
                && (request.getItems() == null || request.getItems().isEmpty());
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

    private boolean isValidLateTickReason(String value) {
        if (value == null) {
            return false;
        }
        String trimmed = value.trim();
        return trimmed.length() >= 10;
    }

    /**
     * Today VN: mealPeriod must equal current window (defaults to current if omitted),
     * except same-day late tick with a valid reason for a past period.
     * Past logDate: any period allowed; derive from mealType when unambiguous.
     */
    private MealPeriod resolveAndValidateMealPeriod(
            MealPeriod requested, MealType mealType, LocalDate logDate, String lateTickReason) {
        LocalDate today = DietDates.todayVn();
        MealPeriod current = MealPeriods.current();

        if (logDate != null && logDate.equals(today)) {
            MealPeriod period = requested != null ? requested : current;
            if (period != current) {
                if (isValidLateTickReason(lateTickReason)
                        && MealPeriods.isPastPeriodForLateTick(period)) {
                    return period;
                }
                throw new BadRequestException(
                        "Hôm nay chỉ được ghi nhật ký cho khung giờ hiện tại (" + current + ")");
            }
            return period;
        }

        if (requested != null) {
            return requested;
        }
        return MealPeriods.deriveFromMealType(mealType);
    }
}
