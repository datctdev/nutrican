package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.DietLogImage;
import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.user.entity.MacroTarget;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.ExperimentCohort;
import com.sba.nutricanbe.diet.enums.MealComplexity;
import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.RecognitionSource;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.diet.repository.DietLogImageRepository;
import com.sba.nutricanbe.diet.repository.DietLogItemRepository;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.user.repository.MacroTargetRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.common.util.MacroUtils;
import com.sba.nutricanbe.diet.dto.CreateDietLogRequest;
import com.sba.nutricanbe.diet.dto.DietLogResponse;
import com.sba.nutricanbe.diet.dto.DietSummaryResponse;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.diet.service.DietLogService;
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
import java.util.List;
import com.sba.nutricanbe.common.dto.MacroNutrients;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DietLogServiceImpl implements DietLogService {

    private static final Set<DietLogStatus> SUMMARY_STATUSES = Set.of(
            DietLogStatus.APPROVED, DietLogStatus.LOGGED, DietLogStatus.PT_REVIEWING);

    private final DietLogRepository dietLogRepository;
    private final DietLogImageRepository dietLogImageRepository;
    private final DietLogItemRepository dietLogItemRepository;
    private final UserRepository userRepository;
    private final MacroTargetRepository macroTargetRepository;
    private final FoodItemRepository foodItemRepository;
    private final StorageService minioService;
    private final DietLogHelper dietLogHelper;

    @Override
    @Transactional
    public ApiResponse<DietLogResponse> createLog(UUID customerId, CreateDietLogRequest request) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", customerId));

        MealSource mealSource = request.getMealSource() != null ? request.getMealSource() : MealSource.HOME_COOKED;
        MealComplexity mealComplexity = request.getMealComplexity() != null ? request.getMealComplexity() : MealComplexity.SIMPLE;

        DietLog dietLog = DietLog.builder()
                .customer(customer)
                .mealType(request.getMealType())
                .foodDescription(request.getFoodDescription())
                .logDate(request.getLogDate() != null ? request.getLogDate() : LocalDate.now())
                .status(DietLogStatus.LOGGED)
                .mealSource(mealSource)
                .mealComplexity(mealComplexity)
                .restaurantName(request.getRestaurantName())
                .recognitionSource(RecognitionSource.MANUAL)
                .experimentCohort(ExperimentCohort.MANUAL_ENTRY)
                .foodItemId(request.getFoodItemId())
                .build();

        if (request.getItems() != null && !request.getItems().isEmpty()) {
            dietLogHelper.applyItemsToLog(dietLog, request.getItems());
            dietLog.setRecognitionSource(RecognitionSource.DB_MATCH);
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
        dietLog = dietLogRepository.save(dietLog);
        log.info("Diet log created: {} by user: {}", dietLog.getId(), customerId);
        return ApiResponse.success(dietLogHelper.toResponse(dietLog), "Diet log created");
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
        if (!dietLog.getCustomer().getId().equals(customerId)) {
            throw new BadRequestException("You can only view your own diet logs");
        }
        return ApiResponse.success(dietLogHelper.toResponse(dietLog));
    }

    @Override
    @Transactional
    public ApiResponse<DietLogResponse> updateLog(UUID logId, UUID userId, CreateDietLogRequest request) {
        DietLog dietLog = dietLogRepository.findById(logId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", logId));

        if (!dietLog.getCustomer().getId().equals(userId)) {
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

        dietLog = dietLogRepository.save(dietLog);
        return ApiResponse.success(dietLogHelper.toResponse(dietLog), "Diet log updated");
    }

    @Override
    @Transactional
    public ApiResponse<DietLogResponse> submitForReview(UUID logId, UUID customerId) {
        DietLog dietLog = dietLogRepository.findById(logId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", logId));
        if (!dietLog.getCustomer().getId().equals(customerId)) {
            throw new BadRequestException("You can only submit your own diet logs");
        }
        if (dietLog.getStatus() != DietLogStatus.DRAFT) {
            throw new BadRequestException("Only DRAFT logs can be submitted for review");
        }
        dietLog.setStatus(DietLogStatus.PT_REVIEWING);
        dietLogHelper.assignPtReviewerIfNeeded(dietLog, customerId);
        dietLog = dietLogRepository.save(dietLog);
        dietLogHelper.notifyPtOfNewLog(dietLog);
        return ApiResponse.success(dietLogHelper.toResponse(dietLog), "Log submitted for PT review");
    }

    @Override
    @Transactional
    public ApiResponse<Void> deleteLog(UUID logId, UUID userId) {
        DietLog dietLog = dietLogRepository.findById(logId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", logId));

        if (!dietLog.getCustomer().getId().equals(userId)) {
            throw new BadRequestException("You can only delete your own diet logs");
        }

        if (dietLog.getImageObjectName() != null) {
            minioService.deleteFile(dietLog.getImageObjectName());
        }
        List<DietLogImage> additionalImages = dietLogImageRepository.findByDietLogIdOrderBySortOrderAsc(logId);
        for (DietLogImage img : additionalImages) {
            minioService.deleteFile(img.getImageObjectName());
        }
        dietLogImageRepository.deleteAll(additionalImages);
        dietLogItemRepository.deleteByDietLogId(logId);
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

        MacroTarget target = macroTargetRepository.findByUserId(customerId).orElse(null);

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
                .build();

        return ApiResponse.success(summary);
    }
}
