package com.sba.nutrican_be.diet.service;

import com.sba.nutrican_be.ai.MealRecognitionResult;
import com.sba.nutrican_be.ai.service.MealRecognitionService;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.core.dto.SosTicketResponse;
import com.sba.nutrican_be.core.entity.DietLog;
import com.sba.nutrican_be.core.entity.DietLogImage;
import com.sba.nutrican_be.core.entity.DietLogItem;
import com.sba.nutrican_be.core.entity.FoodItem;
import com.sba.nutrican_be.core.entity.MacroTarget;
import com.sba.nutrican_be.core.entity.PtClientMapping;
import com.sba.nutrican_be.core.entity.SOSTicket;
import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.core.enums.ClientMappingStatus;
import com.sba.nutrican_be.core.enums.DietLogItemSource;
import com.sba.nutrican_be.core.enums.DietLogStatus;
import com.sba.nutrican_be.core.enums.ExperimentCohort;
import com.sba.nutrican_be.core.enums.MealComplexity;
import com.sba.nutrican_be.core.enums.MealSource;
import com.sba.nutrican_be.core.enums.MealType;
import com.sba.nutrican_be.core.enums.RecognitionSource;
import com.sba.nutrican_be.core.enums.SOSTicketStatus;
import com.sba.nutrican_be.core.enums.SosReasonCode;
import com.sba.nutrican_be.core.util.RblCohortUtil;
import com.sba.nutrican_be.core.event.DietLogCreatedEvent;
import com.sba.nutrican_be.core.event.SosTicketCreatedEvent;
import com.sba.nutrican_be.core.exception.BadRequestException;
import com.sba.nutrican_be.core.exception.ResourceNotFoundException;
import com.sba.nutrican_be.core.repository.DietLogImageRepository;
import com.sba.nutrican_be.core.repository.DietLogItemRepository;
import com.sba.nutrican_be.core.repository.DietLogRepository;
import com.sba.nutrican_be.core.repository.FoodItemRepository;
import com.sba.nutrican_be.core.repository.MacroTargetRepository;
import com.sba.nutrican_be.core.repository.PtClientMappingRepository;
import com.sba.nutrican_be.core.repository.SOSTicketRepository;
import com.sba.nutrican_be.core.repository.UserRepository;
import com.sba.nutrican_be.core.service.MinioService;
import com.sba.nutrican_be.core.util.MacroUtils;
import com.sba.nutrican_be.diet.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DietLogServiceImpl implements DietLogService {

    private static final BigDecimal CONFIDENCE_THRESHOLD = new BigDecimal("0.6");
    private static final Set<DietLogStatus> SUMMARY_STATUSES = Set.of(
            DietLogStatus.APPROVED, DietLogStatus.LOGGED, DietLogStatus.PT_REVIEWING);

    private final DietLogRepository dietLogRepository;
    private final DietLogImageRepository dietLogImageRepository;
    private final DietLogItemRepository dietLogItemRepository;
    private final SOSTicketRepository sosTicketRepository;
    private final UserRepository userRepository;
    private final PtClientMappingRepository ptClientMappingRepository;
    private final MacroTargetRepository macroTargetRepository;
    private final FoodItemRepository foodItemRepository;
    private final MealRecognitionService mealRecognitionService;
    private final MinioService minioService;
    private final FoodCatalogService foodCatalogService;
    private final ApplicationEventPublisher eventPublisher;

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
            applyItemsToLog(dietLog, request.getItems());
            dietLog.setRecognitionSource(RecognitionSource.DB_MATCH);
        } else if (request.getCalories() != null) {
            Map<String, Object> macros = MacroUtils.newMacroMap();
            macros.put("calories", request.getCalories());
            macros.put("protein", request.getProtein());
            macros.put("carbs", request.getCarb());
            macros.put("fat", request.getFat());
            dietLog.setMacrosJson(macros);
        } else if (request.getFoodItemId() != null) {
            Optional<FoodItem> foodOpt = foodItemRepository.findById(request.getFoodItemId());
            if (foodOpt.isPresent()) {
                FoodItem food = foodOpt.get();
                dietLog.setMacrosJson(macrosForFood(food, food.getServingSizeG()));
                dietLog.setFoodDescription(food.getNameVi());
            }
        }

        assignPtReviewerIfNeeded(dietLog, customerId);
        dietLog = dietLogRepository.save(dietLog);
        log.info("Diet log created: {} by user: {}", dietLog.getId(), customerId);
        return ApiResponse.success(toResponse(dietLog), "Diet log created");
    }

    @Override
    @Transactional
    public ApiResponse<AnalyzeMealResponse> analyzeMeal(UUID customerId, MultipartFile file, AnalyzeMealContext context) {
        try {
            AnalyzeMealContext ctx = context != null ? context : AnalyzeMealContext.builder().build();
            MealSource mealSource = ctx.getMealSource() != null ? ctx.getMealSource() : MealSource.HOME_COOKED;
            MealComplexity mealComplexity = ctx.getMealComplexity() != null ? ctx.getMealComplexity() : MealComplexity.SIMPLE;

            if (mealSource == MealSource.RESTAURANT && ctx.getRestaurantName() == null) {
                throw new BadRequestException("restaurantName is required when mealSource is RESTAURANT");
            }

            MealRecognitionResult aiResult = mealRecognitionService.recognizeMealFromFile(
                    file,
                    ctx.getMealType(),
                    mealSource.name(),
                    mealComplexity.name());

            String objectName = minioService.uploadFile(file, "diet-logs/" + customerId);
            String imageUrl = minioService.getPresignedUrl(objectName);

            User customer = userRepository.findById(customerId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", customerId));

            MealType mealType = parseMealType(ctx.getMealType());
            List<FoodItemResponse> suggestedMatches = foodCatalogService.findMatches(aiResult.getFoodName(), 5);
            Optional<FoodItemResponse> bestMatch = suggestedMatches.stream().findFirst();

            Map<String, Object> aiPredictedMacros = MacroUtils.fromValues(
                    aiResult.getCalories(), aiResult.getProtein(), aiResult.getCarbs(), aiResult.getFat());

            RecognitionSource recognitionSource = RecognitionSource.AI_ONLY;
            Map<String, Object> macros = MacroUtils.copyMacroMap(aiPredictedMacros);
            Map<String, Object> dbMatchedMacros = null;
            Integer dbMatchScore = null;
            String matchedFoodName = null;
            boolean dbApplied = false;

            if (mealComplexity == MealComplexity.HOTPOT && ctx.getHotpotItemIds() != null && !ctx.getHotpotItemIds().isEmpty()) {
                dbMatchedMacros = buildHotpotMacros(ctx);
                macros = MacroUtils.copyMacroMap(dbMatchedMacros);
                recognitionSource = RecognitionSource.HYBRID;
                dbApplied = true;
            } else if (mealComplexity == MealComplexity.COMPOSITE && ctx.getCompositeItemIds() != null && !ctx.getCompositeItemIds().isEmpty()) {
                dbMatchedMacros = buildCompositeMacros(ctx);
                macros = MacroUtils.copyMacroMap(dbMatchedMacros);
                recognitionSource = RecognitionSource.HYBRID;
                dbApplied = true;
            } else if (bestMatch.isPresent()) {
                FoodItem food = foodItemRepository.findById(bestMatch.get().getId()).orElseThrow();
                dbMatchScore = foodCatalogService.getMatchScore(aiResult.getFoodName(), food.getId());
                matchedFoodName = food.getNameVi();
                BigDecimal portion = aiResult.getPortionSize() != null ? aiResult.getPortionSize() : food.getServingSizeG();
                dbMatchedMacros = macrosForFood(food, portion);
                if (isHighConfidence(aiResult)) {
                    macros = MacroUtils.copyMacroMap(dbMatchedMacros);
                    recognitionSource = RecognitionSource.HYBRID;
                    dbApplied = true;
                }
            }

            ExperimentCohort cohort = RblCohortUtil.resolve(mealSource, mealComplexity, recognitionSource);
            DietLogStatus status = resolveStatus(aiResult);
            boolean suggestSos = shouldSuggestSos(mealSource, aiResult, bestMatch.isPresent());

            Map<String, Object> aiRaw = new HashMap<>();
            aiRaw.put("foodName", aiResult.getFoodName());
            aiRaw.put("confidenceScore", aiResult.getConfidenceScore());
            aiRaw.put("fallback", aiResult.isFallback());
            aiRaw.put("message", aiResult.getMessage());
            aiRaw.put("portionSize", aiResult.getPortionSize());
            aiRaw.put("calories", aiResult.getCalories());
            aiRaw.put("protein", aiResult.getProtein());
            aiRaw.put("carbs", aiResult.getCarbs());
            aiRaw.put("fat", aiResult.getFat());
            aiRaw.put("detectedItems", aiResult.getDetectedItems() != null ? aiResult.getDetectedItems() : List.of());
            aiRaw.put("uncertaintyReasons", aiResult.getUncertaintyReasons() != null ? aiResult.getUncertaintyReasons() : List.of());
            aiRaw.put("mealComplexityFromAi", aiResult.getMealComplexityFromAi());
            aiRaw.put("db_applied", dbApplied);

            DietLog dietLog = DietLog.builder()
                    .customer(customer)
                    .imageUrl(imageUrl)
                    .imageObjectName(objectName)
                    .mealType(mealType)
                    .foodDescription(aiResult.getFoodName())
                    .aiConfidenceScore(aiResult.getConfidenceScore())
                    .macrosJson(macros)
                    .aiPredictedMacros(aiPredictedMacros)
                    .dbMatchedMacros(dbMatchedMacros)
                    .dbMatchScore(dbMatchScore)
                    .modelVersion(mealRecognitionService.getModelName())
                    .promptVersion(mealRecognitionService.getPromptVersionHash())
                    .experimentCohort(cohort)
                    .status(status)
                    .logDate(LocalDate.now())
                    .mealSource(mealSource)
                    .mealComplexity(mealComplexity)
                    .restaurantName(ctx.getRestaurantName())
                    .recognitionSource(recognitionSource)
                    .foodItemId(bestMatch.map(FoodItemResponse::getId).orElse(null))
                    .matchedFoodName(matchedFoodName)
                    .aiRawJson(aiRaw)
                    .build();

            if (mealComplexity == MealComplexity.HOTPOT) {
                addHotpotItems(dietLog, ctx);
            } else if (mealComplexity == MealComplexity.COMPOSITE) {
                addCompositeItems(dietLog, ctx);
            }

            assignPtReviewerIfNeeded(dietLog, customerId);
            dietLog = dietLogRepository.save(dietLog);
            notifyPtOfNewLog(dietLog);

            log.info("Diet log created via AI: {} for user: {}, confidence: {}",
                    dietLog.getId(), customerId, aiResult.getConfidenceScore());

            AnalyzeMealResponse response = AnalyzeMealResponse.builder()
                    .logId(dietLog.getId())
                    .foodName(aiResult.getFoodName())
                    .portionSize(aiResult.getPortionSize())
                    .portionUnit(aiResult.getPortionUnit())
                    .calories(MacroUtils.toBd(macros.get("calories")))
                    .protein(MacroUtils.toBd(macros.get("protein")))
                    .carb(MacroUtils.toBd(macros.get("carbs")))
                    .fat(MacroUtils.toBd(macros.get("fat")))
                    .confidenceScore(aiResult.getConfidenceScore())
                    .fallback(aiResult.isFallback())
                    .message(aiResult.getMessage())
                    .mealType(mealType)
                    .suggestSos(suggestSos)
                    .suggestedFoodMatches(suggestedMatches)
                    .build();

            return ApiResponse.success(response,
                    aiResult.isFallback() ? "Low confidence, please verify" : "Meal analyzed successfully");
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Failed to analyze meal: " + e.getMessage());
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

        return ApiResponse.success(PageResponse.from(logPage.map(this::toResponse)));
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<DietLogResponse> getLogById(UUID logId, UUID customerId) {
        DietLog dietLog = dietLogRepository.findByIdWithCustomer(logId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", logId));
        if (!dietLog.getCustomer().getId().equals(customerId)) {
            throw new BadRequestException("You can only view your own diet logs");
        }
        return ApiResponse.success(toResponse(dietLog));
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
            Map<String, Object> macros = MacroUtils.newMacroMap();
            macros.put("calories", request.getCalories());
            macros.put("protein", request.getProtein());
            macros.put("carbs", request.getCarb());
            macros.put("fat", request.getFat());
            dietLog.setMacrosJson(macros);
            dietLog.setStatus(DietLogStatus.LOGGED);
        }

        dietLog = dietLogRepository.save(dietLog);
        return ApiResponse.success(toResponse(dietLog), "Diet log updated");
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
                totalCalories = MacroUtils.add(totalCalories, MacroUtils.getMacro(dietLog, "calories"));
                totalProtein = MacroUtils.add(totalProtein, MacroUtils.getMacro(dietLog, "protein"));
                totalCarb = MacroUtils.add(totalCarb, MacroUtils.getMacro(dietLog, "carbs"));
                totalFat = MacroUtils.add(totalFat, MacroUtils.getMacro(dietLog, "fat"));
            }
            countableLogs.add(toResponse(dietLog));
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

    @Override
    @Transactional
    public ApiResponse<Void> createSosTicket(UUID customerId, CreateSosRequest request) {
        userRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", customerId));

        DietLog dietLog = null;
        if (request.getDietLogId() != null) {
            dietLog = dietLogRepository.findById(request.getDietLogId())
                    .orElseThrow(() -> new ResourceNotFoundException("DietLog", request.getDietLogId()));
            if (!dietLog.getCustomer().getId().equals(customerId)) {
                throw new BadRequestException("You can only create SOS for your own diet logs");
            }
            dietLog.setSosTicketFlag(true);
            dietLogRepository.save(dietLog);
        }

        SosReasonCode reasonCode = request.getReasonCode();
        if (reasonCode == null && dietLog != null) {
            reasonCode = resolveAutoSosReason(dietLog);
        }

        SOSTicket ticket = SOSTicket.builder()
                .dietLog(dietLog)
                .priority(request.getPriority() != null ? request.getPriority() : "HIGH")
                .note(request.getNote())
                .status(SOSTicketStatus.OPEN)
                .reasonCode(reasonCode)
                .mealSource(request.getMealSource() != null ? request.getMealSource() : (dietLog != null ? dietLog.getMealSource() : null))
                .autoCreated(request.getAutoCreated() != null ? request.getAutoCreated() : reasonCode != null && request.getReasonCode() == null)
                .build();

        sosTicketRepository.save(ticket);
        notifyPtOfSos(customerId, request.getPriority() != null ? request.getPriority() : "HIGH");
        log.info("SOS ticket created by user: {}", customerId);
        return ApiResponse.success(null, "SOS ticket created, your PT has been notified");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<SosTicketResponse>> getSosTickets(UUID customerId) {
        List<SosTicketResponse> tickets = sosTicketRepository.findByCustomerId(customerId).stream()
                .map(this::toSosResponse)
                .collect(Collectors.toList());
        return ApiResponse.success(tickets, "SOS tickets retrieved");
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
        assignPtReviewerIfNeeded(dietLog, customerId);
        dietLog = dietLogRepository.save(dietLog);
        notifyPtOfNewLog(dietLog);
        return ApiResponse.success(toResponse(dietLog), "Log submitted for PT review");
    }

    private void applyItemsToLog(DietLog dietLog, List<DietLogItemRequest> itemRequests) {
        List<DietLogItem> items = new ArrayList<>();
        BigDecimal totalCal = MacroUtils.ZERO, totalPro = MacroUtils.ZERO, totalCarb = MacroUtils.ZERO, totalFat = MacroUtils.ZERO;
        StringBuilder description = new StringBuilder();

        for (DietLogItemRequest req : itemRequests) {
            DietLogItem item = buildLogItem(dietLog, req);
            items.add(item);
            totalCal = MacroUtils.add(totalCal, item.getCalories());
            totalPro = MacroUtils.add(totalPro, item.getProtein());
            totalCarb = MacroUtils.add(totalCarb, item.getCarb());
            totalFat = MacroUtils.add(totalFat, item.getFat());
            if (!description.isEmpty()) description.append(", ");
            description.append(item.getItemName());
        }

        dietLog.getItems().clear();
        dietLog.getItems().addAll(items);
        if (dietLog.getFoodDescription() == null || dietLog.getFoodDescription().isBlank()) {
            dietLog.setFoodDescription(description.toString());
        }

        Map<String, Object> macros = MacroUtils.newMacroMap();
        macros.put("calories", totalCal);
        macros.put("protein", totalPro);
        macros.put("carbs", totalCarb);
        macros.put("fat", totalFat);
        dietLog.setMacrosJson(macros);
    }

    private Map<String, Object> buildCompositeMacros(AnalyzeMealContext ctx) {
        DietLog temp = DietLog.builder().build();
        List<DietLogItemRequest> requests = new ArrayList<>();
        if (ctx.getCompositeItemIds() != null) {
            List<BigDecimal> portions = ctx.getCompositePortions() != null ? ctx.getCompositePortions() : List.of();
            for (int i = 0; i < ctx.getCompositeItemIds().size(); i++) {
                DietLogItemRequest item = new DietLogItemRequest();
                item.setFoodItemId(ctx.getCompositeItemIds().get(i));
                item.setQuantityG(i < portions.size() && portions.get(i) != null ? portions.get(i) : BigDecimal.valueOf(100));
                requests.add(item);
            }
        }
        applyItemsToLog(temp, requests);
        return temp.getMacrosJson();
    }

    private void addCompositeItems(DietLog dietLog, AnalyzeMealContext ctx) {
        List<DietLogItemRequest> requests = new ArrayList<>();
        if (ctx.getCompositeItemIds() != null) {
            List<BigDecimal> portions = ctx.getCompositePortions() != null ? ctx.getCompositePortions() : List.of();
            for (int i = 0; i < ctx.getCompositeItemIds().size(); i++) {
                DietLogItemRequest item = new DietLogItemRequest();
                item.setFoodItemId(ctx.getCompositeItemIds().get(i));
                item.setQuantityG(i < portions.size() && portions.get(i) != null ? portions.get(i) : BigDecimal.valueOf(100));
                requests.add(item);
            }
        }
        applyItemsToLog(dietLog, requests);
        dietLog.setFoodDescription("Buffet: " + dietLog.getFoodDescription());
    }

    private SosReasonCode resolveAutoSosReason(DietLog dietLog) {
        if (dietLog.getMealComplexity() == MealComplexity.HOTPOT) {
            return SosReasonCode.HOTPOT_HELP;
        }
        if (dietLog.getAiConfidenceScore() != null
                && dietLog.getAiConfidenceScore().compareTo(CONFIDENCE_THRESHOLD) < 0) {
            return SosReasonCode.LOW_CONFIDENCE;
        }
        if (dietLog.getFoodItemId() == null) {
            return SosReasonCode.UNKNOWN_FOOD;
        }
        if (dietLog.getAiRawJson() != null) {
            Object reasons = dietLog.getAiRawJson().get("uncertaintyReasons");
            if (reasons instanceof List<?> list && !list.isEmpty()) {
                String joined = list.stream().map(Object::toString).map(String::toLowerCase).reduce("", String::concat);
                if (joined.contains("portion")) {
                    return SosReasonCode.PORTION_UNCLEAR;
                }
            }
        }
        return SosReasonCode.USER_REQUEST;
    }

    private void addHotpotItems(DietLog dietLog, AnalyzeMealContext ctx) {
        List<DietLogItemRequest> requests = new ArrayList<>();
        if (ctx.getHotpotBrothId() != null) {
            DietLogItemRequest broth = new DietLogItemRequest();
            broth.setFoodItemId(ctx.getHotpotBrothId());
            broth.setQuantityG(BigDecimal.valueOf(300));
            requests.add(broth);
        }
        if (ctx.getHotpotItemIds() != null) {
            List<BigDecimal> portions = ctx.getHotpotPortions() != null ? ctx.getHotpotPortions() : List.of();
            for (int i = 0; i < ctx.getHotpotItemIds().size(); i++) {
                DietLogItemRequest item = new DietLogItemRequest();
                item.setFoodItemId(ctx.getHotpotItemIds().get(i));
                BigDecimal portion = i < portions.size() && portions.get(i) != null
                        ? portions.get(i) : BigDecimal.valueOf(100);
                item.setQuantityG(portion);
                requests.add(item);
            }
        }
        applyItemsToLog(dietLog, requests);
        dietLog.setFoodDescription("Lẩu: " + dietLog.getFoodDescription());
    }

    private Map<String, Object> buildHotpotMacros(AnalyzeMealContext ctx) {
        DietLog temp = DietLog.builder().build();
        List<DietLogItemRequest> requests = new ArrayList<>();
        if (ctx.getHotpotBrothId() != null) {
            DietLogItemRequest broth = new DietLogItemRequest();
            broth.setFoodItemId(ctx.getHotpotBrothId());
            broth.setQuantityG(BigDecimal.valueOf(300));
            requests.add(broth);
        }
        if (ctx.getHotpotItemIds() != null) {
            List<BigDecimal> portions = ctx.getHotpotPortions() != null ? ctx.getHotpotPortions() : List.of();
            for (int i = 0; i < ctx.getHotpotItemIds().size(); i++) {
                DietLogItemRequest item = new DietLogItemRequest();
                item.setFoodItemId(ctx.getHotpotItemIds().get(i));
                item.setQuantityG(i < portions.size() && portions.get(i) != null ? portions.get(i) : BigDecimal.valueOf(100));
                requests.add(item);
            }
        }
        applyItemsToLog(temp, requests);
        return temp.getMacrosJson();
    }

    private DietLogItem buildLogItem(DietLog dietLog, DietLogItemRequest req) {
        FoodItem food = null;
        if (req.getFoodItemId() != null) {
            food = foodItemRepository.findById(req.getFoodItemId()).orElse(null);
        }
        BigDecimal quantity = req.getQuantityG() != null ? req.getQuantityG() : BigDecimal.valueOf(100);
        Map<String, Object> itemMacros;
        String itemName = req.getItemName();

        if (food != null) {
            itemMacros = macrosForFood(food, quantity);
            itemName = food.getNameVi();
        } else {
            itemMacros = MacroUtils.newMacroMap();
            itemMacros.put("calories", req.getCalories() != null ? req.getCalories() : MacroUtils.ZERO);
            itemMacros.put("protein", req.getProtein() != null ? req.getProtein() : MacroUtils.ZERO);
            itemMacros.put("carbs", req.getCarb() != null ? req.getCarb() : MacroUtils.ZERO);
            itemMacros.put("fat", req.getFat() != null ? req.getFat() : MacroUtils.ZERO);
            itemName = req.getItemName() != null ? req.getItemName() : "Item";
        }

        return DietLogItem.builder()
                .dietLog(dietLog)
                .foodItemId(req.getFoodItemId())
                .itemName(itemName)
                .quantityG(quantity)
                .calories(MacroUtils.toBd(itemMacros.get("calories")))
                .protein(MacroUtils.toBd(itemMacros.get("protein")))
                .carb(MacroUtils.toBd(itemMacros.get("carbs")))
                .fat(MacroUtils.toBd(itemMacros.get("fat")))
                .source(food != null ? DietLogItemSource.DB : DietLogItemSource.USER_SELECTED)
                .build();
    }

    private Map<String, Object> macrosForFood(FoodItem food, BigDecimal quantityG) {
        BigDecimal serving = food.getServingSizeG() != null && food.getServingSizeG().compareTo(BigDecimal.ZERO) > 0
                ? food.getServingSizeG() : BigDecimal.valueOf(100);
        BigDecimal ratio = quantityG.divide(serving, 4, RoundingMode.HALF_UP);
        Map<String, Object> macros = MacroUtils.newMacroMap();
        macros.put("calories", scale(food.getCalories(), ratio));
        macros.put("protein", scale(food.getProtein(), ratio));
        macros.put("carbs", scale(food.getCarb(), ratio));
        macros.put("fat", scale(food.getFat(), ratio));
        return macros;
    }

    private BigDecimal scale(BigDecimal value, BigDecimal ratio) {
        if (value == null) return MacroUtils.ZERO;
        return value.multiply(ratio).setScale(2, RoundingMode.HALF_UP);
    }

    private DietLogStatus resolveStatus(MealRecognitionResult aiResult) {
        if (aiResult.isFallback()) return DietLogStatus.DRAFT;
        if (aiResult.getConfidenceScore() == null) return DietLogStatus.DRAFT;
        return aiResult.getConfidenceScore().compareTo(CONFIDENCE_THRESHOLD) >= 0
                ? DietLogStatus.PT_REVIEWING : DietLogStatus.DRAFT;
    }

    private boolean isHighConfidence(MealRecognitionResult aiResult) {
        return !aiResult.isFallback()
                && aiResult.getConfidenceScore() != null
                && aiResult.getConfidenceScore().compareTo(CONFIDENCE_THRESHOLD) >= 0;
    }

    private boolean shouldSuggestSos(MealSource mealSource, MealRecognitionResult aiResult, boolean hasDbMatch) {
        if (mealSource == MealSource.HOME_COOKED) return false;
        return !isHighConfidence(aiResult) || !hasDbMatch;
    }

    private void assignPtReviewerIfNeeded(DietLog dietLog, UUID customerId) {
        if (dietLog.getStatus() != DietLogStatus.PT_REVIEWING) return;
        findActivePt(customerId).ifPresent(mapping -> dietLog.setPtReviewer(mapping.getPt()));
    }

    private Optional<PtClientMapping> findActivePt(UUID customerId) {
        return ptClientMappingRepository.findByClient_Id(customerId, PageRequest.of(0, 1))
                .getContent().stream()
                .filter(m -> m.getStatus() == ClientMappingStatus.ACTIVE)
                .findFirst();
    }

    private void notifyPtOfNewLog(DietLog dietLog) {
        if (dietLog.getStatus() != DietLogStatus.PT_REVIEWING) return;
        UUID ptId = dietLog.getPtReviewer() != null ? dietLog.getPtReviewer().getId() : null;
        if (ptId == null) {
            ptId = findActivePt(dietLog.getCustomer().getId()).map(m -> m.getPt().getId()).orElse(null);
        }
        if (ptId == null) return;
        eventPublisher.publishEvent(new DietLogCreatedEvent(
                this,
                ptId,
                dietLog.getCustomer().getId(),
                dietLog.getCustomer().getFullName(),
                dietLog.getId(),
                dietLog.getMealType() != null ? dietLog.getMealType().name() : null
        ));
    }

    private void notifyPtOfSos(UUID customerId, String priority) {
        findActivePt(customerId).ifPresent(mapping -> {
            User client = mapping.getClient();
            eventPublisher.publishEvent(new SosTicketCreatedEvent(
                    this,
                    mapping.getPt().getId(),
                    client.getId(),
                    client.getFullName(),
                    priority
            ));
        });
    }

    private MealType parseMealType(String mealTypeStr) {
        if (mealTypeStr == null) return null;
        try {
            return MealType.valueOf(mealTypeStr);
        } catch (Exception e) {
            return null;
        }
    }

    private DietLogResponse toResponse(DietLog dietLog) {
        List<DietLogImageDTO> additionalImages = null;
        if (dietLog.getAdditionalImages() != null && !dietLog.getAdditionalImages().isEmpty()) {
            additionalImages = dietLog.getAdditionalImages().stream()
                    .map(img -> DietLogImageDTO.builder()
                            .id(img.getId())
                            .dietLogId(dietLog.getId())
                            .imageUrl(img.getImageUrl())
                            .imageObjectName(img.getImageObjectName())
                            .isPrimary(img.getIsPrimary())
                            .sortOrder(img.getSortOrder())
                            .fileSize(img.getFileSize())
                            .contentType(img.getContentType())
                            .aiConfidenceScore(img.getAiConfidenceScore())
                            .macrosJson(img.getMacrosJson())
                            .build())
                    .collect(Collectors.toList());
        }

        List<DietLogItemResponse> items = null;
        if (dietLog.getItems() != null && !dietLog.getItems().isEmpty()) {
            items = dietLog.getItems().stream().map(item -> DietLogItemResponse.builder()
                    .id(item.getId())
                    .foodItemId(item.getFoodItemId())
                    .itemName(item.getItemName())
                    .quantityG(item.getQuantityG())
                    .calories(item.getCalories())
                    .protein(item.getProtein())
                    .carb(item.getCarb())
                    .fat(item.getFat())
                    .source(item.getSource())
                    .build()).collect(Collectors.toList());
        }

        List<FoodItemResponse> suggestedMatches = null;
        if (dietLog.getFoodDescription() != null) {
            suggestedMatches = foodCatalogService.findMatches(dietLog.getFoodDescription(), 3);
        }

        return DietLogResponse.builder()
                .id(dietLog.getId())
                .customerId(dietLog.getCustomer().getId())
                .customerName(dietLog.getCustomer().getFullName())
                .imageUrl(dietLog.getImageUrl())
                .aiConfidenceScore(dietLog.getAiConfidenceScore())
                .macrosJson(dietLog.getMacrosJson())
                .mealType(dietLog.getMealType())
                .status(dietLog.getStatus())
                .foodDescription(dietLog.getFoodDescription())
                .sosTicketFlag(dietLog.getSosTicketFlag())
                .ptReviewerId(dietLog.getPtReviewer() != null ? dietLog.getPtReviewer().getId() : null)
                .ptNote(dietLog.getPtNote())
                .logDate(dietLog.getLogDate())
                .createdAt(dietLog.getCreatedAt())
                .additionalImages(additionalImages)
                .mealSource(dietLog.getMealSource())
                .mealComplexity(dietLog.getMealComplexity())
                .restaurantName(dietLog.getRestaurantName())
                .recognitionSource(dietLog.getRecognitionSource())
                .foodItemId(dietLog.getFoodItemId())
                .suggestSos(shouldSuggestSos(
                        dietLog.getMealSource() != null ? dietLog.getMealSource() : MealSource.HOME_COOKED,
                        MealRecognitionResult.builder()
                                .confidenceScore(dietLog.getAiConfidenceScore())
                                .fallback(dietLog.getStatus() == DietLogStatus.DRAFT)
                                .build(),
                        dietLog.getFoodItemId() != null))
                .suggestedFoodMatches(suggestedMatches)
                .items(items)
                .build();
    }

    private SosTicketResponse toSosResponse(SOSTicket ticket) {
        return SosTicketResponse.builder()
                .id(ticket.getId())
                .dietLogId(ticket.getDietLog() != null ? ticket.getDietLog().getId() : null)
                .note(ticket.getNote())
                .priority(ticket.getPriority())
                .status(ticket.getStatus())
                .reasonCode(ticket.getReasonCode())
                .mealSource(ticket.getMealSource())
                .autoCreated(ticket.getAutoCreated())
                .customerName(ticket.getDietLog() != null && ticket.getDietLog().getCustomer() != null
                        ? ticket.getDietLog().getCustomer().getFullName() : null)
                .ptName(ticket.getPt() != null ? ticket.getPt().getFullName() : null)
                .createdAt(ticket.getCreatedAt())
                .build();
    }
}
