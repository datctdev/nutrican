package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.ai.catalog.A1_0FixedMacros;
import com.sba.nutricanbe.ai.catalog.ResNetFoodCodeMapping;
import com.sba.nutricanbe.ai.catalog.ResNetFoodDefaults;
import com.sba.nutricanbe.ai.dto.FoodGatePreCheckResult;
import com.sba.nutricanbe.ai.dto.FoodPredictionDto;
import com.sba.nutricanbe.ai.dto.MealRecognitionResult;
import com.sba.nutricanbe.ai.dto.ResNetAnalyzeResponse;
import com.sba.nutricanbe.ai.service.MealRecognitionService;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.DietPreference;
import com.sba.nutricanbe.ai.service.FoodGateService;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.FoodGateResult;
import com.sba.nutricanbe.diet.enums.ExperimentCohort;
import com.sba.nutricanbe.diet.enums.MealComplexity;
import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.enums.RecognitionSource;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.user.service.UserQueryService;
import com.sba.nutricanbe.common.util.MacroUtils;
import com.sba.nutricanbe.common.util.RblCohortUtil;
import com.sba.nutricanbe.diet.dto.AnalyzeMealContext;
import com.sba.nutricanbe.diet.dto.AnalyzeMealResponse;
import com.sba.nutricanbe.diet.dto.ConfirmRecognitionRequest;
import com.sba.nutricanbe.diet.dto.DietLogItemRequest;
import com.sba.nutricanbe.diet.dto.DietLogResponse;
import com.sba.nutricanbe.diet.dto.FoodItemResponse;
import com.sba.nutricanbe.diet.dto.FoodPredictionResponse;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.diet.service.FoodCatalogService;
import com.sba.nutricanbe.diet.dto.IntakeControlResult;
import com.sba.nutricanbe.diet.service.DietPrefCheckService;
import com.sba.nutricanbe.diet.service.IntakeControlLoopService;
import com.sba.nutricanbe.diet.service.MealAnalysisService;
import com.sba.nutricanbe.infrastructure.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
import com.sba.nutricanbe.common.dto.MacroNutrients;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MealAnalysisServiceImpl implements MealAnalysisService {

    @Value("${ai.recognition.confidence-threshold:0.25}")
    private BigDecimal confidenceThreshold;

    private final DietLogRepository dietLogRepository;
    private final UserQueryService userQueryService;
    private final FoodItemRepository foodItemRepository;
    private final MealRecognitionService mealRecognitionService;
    private final StorageService minioService;
    private final FoodCatalogService foodCatalogService;
    private final DietLogHelper dietLogHelper;
    private final FoodGateService foodGateService;
    private final DietPrefCheckService dietPrefCheckService;
    private final IntakeControlLoopService intakeControlLoopService;

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

            boolean skipGate = mealComplexity == MealComplexity.HOTPOT || mealComplexity == MealComplexity.COMPOSITE;
            ResNetAnalyzeResponse cachedResNet = null;
            if (!skipGate) {
                FoodGatePreCheckResult preCheck = foodGateService.preCheck(file);
                FoodGateResult gateResult = preCheck.gateResult();
                if (gateResult == FoodGateResult.NOT_FOOD) {
                    throw new BadRequestException("GATE_FAIL_NOT_FOOD: Ảnh không phải thực phẩm. Vui lòng chụp lại bữa ăn.");
                }
                if (gateResult == FoodGateResult.OUT_OF_CLASS) {
                    String objectName = minioService.uploadFile(file, "diet-logs/" + customerId);
                    String imageUrl = minioService.getPresignedUrl(objectName);
                    MealType mealType = dietLogHelper.parseMealType(ctx.getMealType());
                    DietLog manualLog = DietLog.builder()
                            .customerId(customerId)
                            .imageUrl(imageUrl)
                            .imageObjectName(objectName)
                            .mealType(mealType)
                            .status(DietLogStatus.MANUAL_REQUIRED)
                            .reviewStatus(DietLogReviewStatus.NOT_REQUIRED)
                            .logDate(LocalDate.now())
                            .mealSource(mealSource)
                            .mealComplexity(mealComplexity)
                            .restaurantName(ctx.getRestaurantName())
                            .recognitionSource(RecognitionSource.MANUAL)
                            .experimentCohort(ExperimentCohort.MANUAL_ENTRY)
                            .foodDescription("Món chưa được hỗ trợ — nhập tay")
                            .aiRawJson(Map.of("gateResult", "OUT_OF_CLASS", "manualRequired", true))
                            .build();
                    manualLog = dietLogRepository.save(manualLog);
                    AnalyzeMealResponse outOfClass = AnalyzeMealResponse.builder()
                            .logId(manualLog.getId())
                            .message("GATE_WARN_OUT_OF_CLASS: Món này chưa được hỗ trợ. Vui lòng nhập tay.")
                            .manualRequired(true)
                            .gateResult("OUT_OF_CLASS")
                            .mealType(mealType)
                            .build();
                    return ApiResponse.success(outOfClass, outOfClass.getMessage());
                }
                cachedResNet = preCheck.resNetResponse();
            }

            MealRecognitionResult aiResult = mealRecognitionService.recognizeMealFromFile(
                    file,
                    ctx.getMealType(),
                    mealSource.name(),
                    mealComplexity.name(),
                    cachedResNet);

            String objectName = minioService.uploadFile(file, "diet-logs/" + customerId);
            String imageUrl = minioService.getPresignedUrl(objectName);

            User customer = userQueryService.findUserById(customerId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", customerId));

            MealType mealType = dietLogHelper.parseMealType(ctx.getMealType());
            BigDecimal portionRatio = aiResult.getPortionRatio() != null
                    ? aiResult.getPortionRatio() : BigDecimal.ONE;

            Optional<FoodItemResponse> resnetFoodMatch =
                    foodCatalogService.findByResNetFoodCode(aiResult.getFoodCode());
            String catalogLookupName = ResNetFoodCodeMapping.catalogNameVi(aiResult.getFoodCode())
                    .orElse(aiResult.getFoodName());
            List<FoodItemResponse> suggestedMatches = foodCatalogService.findMatches(catalogLookupName, 5);
            Optional<FoodItemResponse> bestMatch = resnetFoodMatch.isPresent()
                    ? resnetFoodMatch
                    : suggestedMatches.stream().findFirst();

            RecognitionSource recognitionSource = RecognitionSource.AI_ONLY;
            MacroNutrients macros = MacroNutrients.ZERO;
            MacroNutrients aiPredictedMacros = A1_0FixedMacros.forCode(aiResult.getFoodCode());
            MacroNutrients dbMatchedMacros = null;
            Integer dbMatchScore = null;
            String matchedFoodName = null;
            boolean dbApplied = false;
            BigDecimal portionG = aiResult.getEstimatedTotalGrams() != null
                    ? aiResult.getEstimatedTotalGrams()
                    : (aiResult.getPortionSize() != null ? aiResult.getPortionSize() : null);

            if (mealComplexity == MealComplexity.HOTPOT && ctx.getHotpotItemIds() != null && !ctx.getHotpotItemIds().isEmpty()) {
                dbMatchedMacros = buildHotpotMacros(ctx);
                macros = dbMatchedMacros;
                aiPredictedMacros = dbMatchedMacros;
                recognitionSource = RecognitionSource.HYBRID;
                dbApplied = true;
            } else if (mealComplexity == MealComplexity.COMPOSITE && ctx.getCompositeItemIds() != null && !ctx.getCompositeItemIds().isEmpty()) {
                dbMatchedMacros = buildCompositeMacros(ctx);
                macros = dbMatchedMacros;
                aiPredictedMacros = dbMatchedMacros;
                recognitionSource = RecognitionSource.HYBRID;
                dbApplied = true;
            } else if (aiResult.getCalories() != null) {
                // UI / A1.1: NutriHome × portion from fusion
                macros = MacroNutrients.of(aiResult.getCalories(), aiResult.getProtein(), aiResult.getCarbs(), aiResult.getFat());
                if (portionG == null && bestMatch.isPresent()) {
                    FoodItem food = foodItemRepository.findById(bestMatch.get().getId()).orElseThrow();
                    BigDecimal serving = food.getServingSizeG() != null && food.getServingSizeG().compareTo(BigDecimal.ZERO) > 0
                            ? food.getServingSizeG() : BigDecimal.valueOf(100);
                    portionG = serving.multiply(portionRatio).setScale(2, RoundingMode.HALF_UP);
                }
                if (bestMatch.isPresent()) {
                    FoodItem food = foodItemRepository.findById(bestMatch.get().getId()).orElseThrow();
                    dbMatchScore = foodCatalogService.getMatchScore(catalogLookupName, food.getId());
                    matchedFoodName = food.getNameVi();
                    BigDecimal dbPortion = portionG != null ? portionG
                            : food.getServingSizeG().multiply(portionRatio);
                    dbMatchedMacros = dietLogHelper.macrosForFood(food, dbPortion);
                    recognitionSource = RecognitionSource.HYBRID;
                    dbApplied = true;
                } else {
                    recognitionSource = Boolean.TRUE.equals(aiResult.getLlavaUsed())
                            ? RecognitionSource.HYBRID : RecognitionSource.AI_ONLY;
                }
            } else if (bestMatch.isPresent()) {
                FoodItem food = foodItemRepository.findById(bestMatch.get().getId()).orElseThrow();
                dbMatchScore = foodCatalogService.getMatchScore(catalogLookupName, food.getId());
                matchedFoodName = food.getNameVi();
                BigDecimal serving = food.getServingSizeG() != null && food.getServingSizeG().compareTo(BigDecimal.ZERO) > 0
                        ? food.getServingSizeG() : BigDecimal.valueOf(100);
                portionG = serving.multiply(portionRatio).setScale(2, RoundingMode.HALF_UP);
                dbMatchedMacros = dietLogHelper.macrosForFood(food, portionG);
                macros = dbMatchedMacros;
                recognitionSource = RecognitionSource.HYBRID;
                dbApplied = true;
            } else {
                macros = aiPredictedMacros;
            }

            List<FoodPredictionResponse> topPredictions = mapTopPredictions(aiResult.getTopPredictions(), portionRatio);
            if (topPredictions.isEmpty() && aiResult.getFoodCode() != null) {
                topPredictions = List.of(buildPredictionPreview(
                        aiResult.getFoodCode(),
                        aiResult.getFoodName(),
                        aiResult.getConfidenceScore(),
                        portionRatio));
            }
            ExperimentCohort cohort = RblCohortUtil.resolve(mealSource, mealComplexity, recognitionSource);
            DietLogStatus status = resolveStatus(aiResult);
            boolean suggestSos = dietLogHelper.shouldSuggestSos(mealSource, aiResult, bestMatch.isPresent());

            Map<String, Object> aiRaw = new HashMap<>();
            aiRaw.put("foodName", aiResult.getFoodName());
            aiRaw.put("foodCode", aiResult.getFoodCode());
            aiRaw.put("confidenceScore", aiResult.getConfidenceScore());
            aiRaw.put("confidenceMargin", aiResult.getConfidenceMargin());
            aiRaw.put("fallback", aiResult.isFallback());
            aiRaw.put("message", aiResult.getMessage());
            aiRaw.put("portionRatio", portionRatio);
            aiRaw.put("foodAreaRatio", aiResult.getFoodAreaRatio());
            aiRaw.put("portionSize", portionG);
            aiRaw.put("calories", aiPredictedMacros.calories());
            aiRaw.put("protein", aiPredictedMacros.protein());
            aiRaw.put("carbs", aiPredictedMacros.carbs());
            aiRaw.put("fat", aiPredictedMacros.fat());
            aiRaw.put("topPredictions", topPredictions);
            aiRaw.put("needsConfirmation", aiResult.getNeedsConfirmation());
            aiRaw.put("llavaUsed", aiResult.getLlavaUsed());
            aiRaw.put("llavaFoodName", aiResult.getLlavaFoodName());
            aiRaw.put("macroSource", aiResult.getMacroSource());
            aiRaw.put("fusionNote", aiResult.getFusionNote());
            aiRaw.put("estimatedTotalGrams", portionG);
            aiRaw.put("detectedItems", aiResult.getDetectedItems() != null ? aiResult.getDetectedItems() : List.of());
            aiRaw.put("uncertaintyReasons", aiResult.getUncertaintyReasons() != null ? aiResult.getUncertaintyReasons() : List.of());
            aiRaw.put("mealComplexityFromAi", aiResult.getMealComplexityFromAi());
            aiRaw.put("db_applied", dbApplied);

            DietLog dietLog = DietLog.builder()
                    .customerId(customer.getId())
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
                    .reviewStatus(DietLogReviewStatus.NOT_REQUIRED)
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

            dietLogHelper.assignPtReviewerIfNeeded(dietLog, customerId);
            DietPreference pref = customer.getDietPreference() != null ? customer.getDietPreference() : DietPreference.NORMAL;
            dietLog.setExperimentCohortKey(com.sba.nutricanbe.common.util.RblCohortUtil.resolveKey(
                    mealSource, mealComplexity, recognitionSource, pref));
            dietLog = dietLogRepository.save(dietLog);

            if (dietLog.getReviewStatus() == DietLogReviewStatus.PENDING) {
                dietLogHelper.notifyPtOfNewLog(dietLog);
            }

            log.info("Diet log created via AI: {} for user: {}, confidence: {}",
                    dietLog.getId(), customerId, aiResult.getConfidenceScore());

            AnalyzeMealResponse response = AnalyzeMealResponse.builder()
                    .logId(dietLog.getId())
                    .foodName(aiResult.getFoodName())
                    .foodCode(aiResult.getFoodCode())
                    .portionSize(portionG)
                    .portionRatio(portionRatio)
                    .portionUnit("grams")
                    .calories(macros.calories())
                    .protein(macros.protein())
                    .carb(macros.carbs())
                    .fat(macros.fat())
                    .confidenceScore(aiResult.getConfidenceScore())
                    .fallback(aiResult.isFallback())
                    .needsConfirmation(aiResult.getNeedsConfirmation())
                    .message(aiResult.getMessage())
                    .mealType(mealType)
                    .suggestSos(suggestSos)
                    .suggestedFoodMatches(suggestedMatches)
                    .topPredictions(topPredictions)
                    .llavaUsed(aiResult.getLlavaUsed())
                    .macroSource(aiResult.getMacroSource())
                    .llavaFoodName(aiResult.getLlavaFoodName())
                    .estimatedTotalGrams(portionG)
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
    @Transactional
    public ApiResponse<DietLogResponse> confirmRecognition(UUID logId, UUID customerId, ConfirmRecognitionRequest request) {
        if (request == null || request.getFoodCode() == null || request.getFoodCode().isBlank()) {
            throw new BadRequestException("foodCode is required");
        }
        DietLog dietLog = dietLogRepository.findById(logId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", logId));
        if (!dietLog.getCustomerId().equals(customerId)) {
            throw new BadRequestException("You can only confirm your own diet logs");
        }

        String foodCode = request.getFoodCode().trim().toLowerCase();
        FoodItem food = foodCatalogService.findByResNetFoodCode(foodCode)
                .flatMap(f -> foodItemRepository.findById(f.getId()))
                .orElseThrow(() -> new BadRequestException("Unknown food code: " + foodCode));

        BigDecimal serving = food.getServingSizeG() != null && food.getServingSizeG().compareTo(BigDecimal.ZERO) > 0
                ? food.getServingSizeG() : BigDecimal.valueOf(100);

        BigDecimal portionG;
        BigDecimal portionRatio;
        if (request.getPortionGrams() != null && request.getPortionGrams().compareTo(BigDecimal.ZERO) > 0) {
            portionG = request.getPortionGrams().setScale(2, RoundingMode.HALF_UP);
            portionRatio = portionG.divide(serving, 3, RoundingMode.HALF_UP);
        } else {
            portionRatio = BigDecimal.ONE;
            if (dietLog.getAiRawJson() != null && dietLog.getAiRawJson().get("portionRatio") != null) {
                portionRatio = MacroUtils.toBd(dietLog.getAiRawJson().get("portionRatio"));
                if (portionRatio == null || portionRatio.compareTo(BigDecimal.ZERO) <= 0) {
                    portionRatio = BigDecimal.ONE;
                }
            }
            portionG = serving.multiply(portionRatio).setScale(2, RoundingMode.HALF_UP);
        }
        MacroNutrients macros = dietLogHelper.macrosForFood(food, portionG);
        MacroNutrients a10Macros = dietLog.getAiPredictedMacros() != null
                ? dietLog.getAiPredictedMacros()
                : A1_0FixedMacros.forCode(foodCode);

        String foodName = ResNetFoodCodeMapping.catalogNameVi(foodCode).orElse(food.getNameVi());
        dietLog.setFoodDescription(foodName);
        dietLog.setMatchedFoodName(food.getNameVi());
        dietLog.setFoodItemId(food.getId());
        dietLog.setMacrosJson(macros);
        dietLog.setAiPredictedMacros(a10Macros);
        dietLog.setDbMatchedMacros(macros);
        dietLog.setRecognitionSource(RecognitionSource.HYBRID);

        Map<String, Object> aiRaw = dietLog.getAiRawJson() != null
                ? new HashMap<>(dietLog.getAiRawJson()) : new HashMap<>();
        aiRaw.put("foodCode", foodCode);
        aiRaw.put("foodName", foodName);
        aiRaw.put("userConfirmed", true);
        aiRaw.put("userAdjustedGrams", portionG);
        aiRaw.put("portionRatio", portionRatio);
        aiRaw.put("portionSize", portionG);
        aiRaw.put("calories", macros.calories());
        aiRaw.put("protein", macros.protein());
        aiRaw.put("carbs", macros.carbs());
        aiRaw.put("fat", macros.fat());
        aiRaw.put("needsConfirmation", false);
        dietLog.setStatus(DietLogStatus.LOGGED);
        boolean sendToPt = Boolean.TRUE.equals(request.getSendToPt());
        dietLog.setReviewStatus(sendToPt ? DietLogReviewStatus.PENDING : DietLogReviewStatus.NOT_REQUIRED);
        dietLog.setAiRawJson(aiRaw);
        dietLog = dietLogRepository.save(dietLog);
        if (sendToPt) {
            dietLogHelper.assignPtReviewerIfNeeded(dietLog, customerId);
            dietLogHelper.notifyPtOfNewLog(dietLog);
        }
        DietLogResponse response = dietLogHelper.toResponse(dietLog);

        User customer = userQueryService.findUserById(customerId).orElse(null);
        if (customer != null && dietPrefCheckService.hasMismatch(customerId, foodCode)) {
            response.setDietPrefWarning(dietPrefCheckService.buildWarningMessage(
                    customer.getDietPreference(),
                    ResNetFoodCodeMapping.catalogNameViOrDisplay(foodCode, foodName)));
        }
        boolean reviewNotRequired = !sendToPt;
        IntakeControlResult loop = intakeControlLoopService.evaluateAfterLog(
                customerId, dietLog.getLogDate(), reviewNotRequired);
        applyControlLoop(response, loop);
        return ApiResponse.success(response, "Recognition confirmed");
    }

    private void applyControlLoop(DietLogResponse response, IntakeControlResult loop) {
        if (loop == null) {
            return;
        }
        response.setIntakeStatus(loop.getIntakeStatus());
        response.setControlLoopMessage(loop.getControlLoopMessage());
        response.setSuggestSubmitToPt(loop.isSuggestSubmitToPt());
    }

    private MacroNutrients buildHotpotMacros(AnalyzeMealContext ctx) {
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
        dietLogHelper.applyItemsToLog(temp, requests);
        return temp.getMacrosJson();
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
        dietLogHelper.applyItemsToLog(dietLog, requests);
        dietLog.setFoodDescription("Lẩu: " + dietLog.getFoodDescription());
    }

    private MacroNutrients buildCompositeMacros(AnalyzeMealContext ctx) {
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
        dietLogHelper.applyItemsToLog(temp, requests);
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
        dietLogHelper.applyItemsToLog(dietLog, requests);
        dietLog.setFoodDescription("Buffet: " + dietLog.getFoodDescription());
    }

    private DietLogStatus resolveStatus(MealRecognitionResult aiResult) {
        return DietLogStatus.DRAFT;
    }

    private List<FoodPredictionResponse> mapTopPredictions(List<FoodPredictionDto> predictions, BigDecimal portionRatio) {
        if (predictions == null || predictions.isEmpty()) {
            return List.of();
        }
        BigDecimal ratio = portionRatio != null ? portionRatio : BigDecimal.ONE;
        return predictions.stream()
                .map(p -> {
                    FoodPredictionResponse.FoodPredictionResponseBuilder builder = FoodPredictionResponse.builder()
                            .foodCode(p.getFoodCode())
                            .foodName(ResNetFoodCodeMapping.catalogNameViOrDisplay(p.getFoodCode(), p.getFoodName()))
                            .confidence(BigDecimal.valueOf(p.getConfidence())
                                    .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
                    var foodOpt = foodCatalogService.findByResNetFoodCode(p.getFoodCode());
                    if (foodOpt.isPresent() && foodOpt.get().getId() != null) {
                        FoodItem food = foodItemRepository.findById(foodOpt.get().getId()).orElse(null);
                        if (food != null) {
                            applyMacroPreview(builder, food, ratio);
                        } else {
                            applyDefaultMacroPreview(builder, p.getFoodCode(), ratio);
                        }
                    } else {
                        applyDefaultMacroPreview(builder, p.getFoodCode(), ratio);
                    }
                    return builder.build();
                })
                .collect(Collectors.toList());
    }

    private void applyMacroPreview(
            FoodPredictionResponse.FoodPredictionResponseBuilder builder, FoodItem food, BigDecimal ratio) {
        BigDecimal serving = food.getServingSizeG() != null
                && food.getServingSizeG().compareTo(BigDecimal.ZERO) > 0
                ? food.getServingSizeG() : BigDecimal.valueOf(100);
        MacroNutrients macros = dietLogHelper.macrosForFood(food, serving.multiply(ratio));
        builder.calories(macros.calories())
                .protein(macros.protein())
                .carb(macros.carbs())
                .fat(macros.fat());
    }

    private void applyDefaultMacroPreview(
            FoodPredictionResponse.FoodPredictionResponseBuilder builder, String foodCode, BigDecimal ratio) {
        Map<String, BigDecimal> macros = ResNetFoodDefaults.scaledMacros(foodCode, ratio);
        if (macros.isEmpty()) {
            return;
        }
        builder.calories(macros.get("calories"))
                .protein(macros.get("protein"))
                .carb(macros.get("carbs"))
                .fat(macros.get("fat"));
    }

    private FoodPredictionResponse buildPredictionPreview(
            String foodCode, String foodName, BigDecimal confidence, BigDecimal portionRatio) {
        FoodPredictionResponse.FoodPredictionResponseBuilder builder = FoodPredictionResponse.builder()
                .foodCode(foodCode)
                .foodName(ResNetFoodCodeMapping.catalogNameViOrDisplay(foodCode, foodName))
                .confidence(confidence);
        applyDefaultMacroPreview(builder, foodCode, portionRatio);
        foodCatalogService.findByResNetFoodCode(foodCode).ifPresent(foodResp -> {
            if (foodResp.getId() != null) {
                foodItemRepository.findById(foodResp.getId()).ifPresent(food ->
                        applyMacroPreview(builder, food, portionRatio));
            }
        });
        return builder.build();
    }
}