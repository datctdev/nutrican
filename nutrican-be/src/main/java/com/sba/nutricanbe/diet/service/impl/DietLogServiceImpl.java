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
import com.sba.nutricanbe.diet.repository.SosTicketRepository;
import com.sba.nutricanbe.user.service.UserQueryService;
import com.sba.nutricanbe.common.util.MacroUtils;
import com.sba.nutricanbe.diet.dto.request.CreateDietLogRequest;
import com.sba.nutricanbe.diet.dto.response.DietLogResponse;
import com.sba.nutricanbe.diet.dto.response.DietSummaryResponse;
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
    private final SosTicketRepository sosTicketRepository;
    private final IntakeControlLoopService intakeControlLoopService;
    private final com.sba.nutricanbe.diet.service.UserRecipeService userRecipeService;
    private final DietPrefCheckService dietPrefCheckService;

    @Override
    @Transactional
    public ApiResponse<DietLogResponse> createLog(UUID customerId, CreateDietLogRequest request) {
        User customer = userQueryService.findUserById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", customerId));

        MealSource mealSource = request.getMealSource() != null ? request.getMealSource() : MealSource.HOME_COOKED;
        MealComplexity mealComplexity = request.getMealComplexity() != null ? request.getMealComplexity() : MealComplexity.SIMPLE;
        boolean sendToPt = Boolean.TRUE.equals(request.getSendToPt());

        DietLog dietLog = DietLog.builder()
                .customerId(customerId)
                .mealType(request.getMealType())
                .foodDescription(request.getFoodDescription())
                .logDate(request.getLogDate() != null ? request.getLogDate() : LocalDate.now())
                .status(DietLogStatus.LOGGED)
                .reviewStatus(sendToPt
                        ? com.sba.nutricanbe.diet.enums.DietLogReviewStatus.PENDING
                        : com.sba.nutricanbe.diet.enums.DietLogReviewStatus.NOT_REQUIRED)
                .mealSource(mealSource)
                .mealComplexity(mealComplexity)
                .restaurantName(request.getRestaurantName())
                .recognitionSource(RecognitionSource.MANUAL)
                .experimentCohort(ExperimentCohort.MANUAL_ENTRY)
                .foodItemId(request.getFoodItemId())
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
        if (sendToPt) {
            dietLog.setIsPtNotified(true);
            dietLogHelper.notifyPtOfNewLog(dietLog);
        }
        log.info("Diet log created: {} by user: {}", dietLog.getId(), customerId);
        DietLogResponse response = dietLogHelper.toResponse(dietLog);
        applyManualWarnings(customerId, request, response);
        IntakeControlResult loop = intakeControlLoopService.evaluateAfterLog(
                customerId, dietLog.getLogDate(), !sendToPt);
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

        if (request.getFoodDescription() != null) dietLog.setFoodDescription(request.getFoodDescription());
        if (request.getMealType() != null) dietLog.setMealType(request.getMealType());
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

        boolean sendToPt = Boolean.TRUE.equals(request.getSendToPt());
        if (sendToPt) {
            dietLog.setStatus(DietLogStatus.LOGGED);
            dietLog.setReviewStatus(com.sba.nutricanbe.diet.enums.DietLogReviewStatus.PENDING);
            dietLog.setIsPtNotified(true);
            dietLogHelper.assignPtReviewerIfNeeded(dietLog, userId);
        }

        dietLog = dietLogRepository.save(dietLog);
        if (sendToPt) {
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

        List<DietLogImage> additionalImages = dietLogImageRepository.findByDietLogIdOrderBySortOrderAsc(logId);
        Set<String> imageObjectNames = new java.util.LinkedHashSet<>();
        if (dietLog.getImageObjectName() != null) {
            imageObjectNames.add(dietLog.getImageObjectName());
        }
        additionalImages.stream().map(DietLogImage::getImageObjectName).forEach(imageObjectNames::add);
        imageObjectNames.forEach(minioService::deleteFile);

        dietLogImageRepository.deleteAll(additionalImages);
        dietLogItemRepository.deleteByDietLogId(logId);
        sosTicketRepository.deleteByDietLogId(logId);
        dietLogRepository.delete(dietLog);

        return ApiResponse.success(null, "Diet log deleted");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<DietSummaryResponse> getSummary(UUID customerId, LocalDate date) {
        if (date == null) date = LocalDate.now();
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
}
