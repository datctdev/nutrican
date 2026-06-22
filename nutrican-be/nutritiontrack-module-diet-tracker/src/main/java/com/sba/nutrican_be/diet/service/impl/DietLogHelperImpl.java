package com.sba.nutrican_be.diet.service.impl;

import com.sba.nutrican_be.diet.service.DietLogHelper;

import com.sba.nutrican_be.ai.dto.MealRecognitionResult;
import com.sba.nutrican_be.core.entity.DietLog;
import com.sba.nutrican_be.core.entity.DietLogItem;
import com.sba.nutrican_be.core.entity.FoodItem;
import com.sba.nutrican_be.core.entity.PtClientMapping;
import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.core.enums.ClientMappingStatus;
import com.sba.nutrican_be.core.enums.DietLogItemSource;
import com.sba.nutrican_be.core.enums.DietLogStatus;
import com.sba.nutrican_be.core.enums.MealSource;
import com.sba.nutrican_be.core.enums.MealType;
import com.sba.nutrican_be.core.event.DietLogCreatedEvent;
import com.sba.nutrican_be.core.repository.FoodItemRepository;
import com.sba.nutrican_be.core.repository.PtClientMappingRepository;
import com.sba.nutrican_be.core.util.MacroUtils;
import com.sba.nutrican_be.diet.dto.DietLogImageDTO;
import com.sba.nutrican_be.diet.dto.DietLogItemRequest;
import com.sba.nutrican_be.diet.dto.DietLogItemResponse;
import com.sba.nutrican_be.diet.dto.DietLogResponse;
import com.sba.nutrican_be.diet.dto.FoodItemResponse;
import com.sba.nutrican_be.diet.service.FoodCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import com.sba.nutrican_be.core.dto.MacroNutrients;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class DietLogHelperImpl implements DietLogHelper {

    private final FoodItemRepository foodItemRepository;
    private final PtClientMappingRepository ptClientMappingRepository;
    private final FoodCatalogService foodCatalogService;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${ai.recognition.confidence-threshold:0.25}")
    private BigDecimal confidenceThreshold;

    @Override
    public void applyItemsToLog(DietLog dietLog, List<DietLogItemRequest> itemRequests) {
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

        MacroNutrients macros = MacroNutrients.of(totalCal, totalPro, totalCarb, totalFat);
        dietLog.setMacrosJson(macros);
    }

    @Override
    public DietLogItem buildLogItem(DietLog dietLog, DietLogItemRequest req) {
        FoodItem food = null;
        if (req.getFoodItemId() != null) {
            food = foodItemRepository.findById(req.getFoodItemId()).orElse(null);
        }
        BigDecimal quantity = req.getQuantityG() != null ? req.getQuantityG() : BigDecimal.valueOf(100);
        MacroNutrients itemMacros;
        String itemName = req.getItemName();

        if (food != null) {
            itemMacros = macrosForFood(food, quantity);
            itemName = food.getNameVi();
        } else {
            itemMacros = MacroNutrients.of(req.getCalories() != null ? req.getCalories() : MacroUtils.ZERO, req.getProtein() != null ? req.getProtein() : MacroUtils.ZERO, req.getCarb() != null ? req.getCarb() : MacroUtils.ZERO, req.getFat() != null ? req.getFat() : MacroUtils.ZERO);
            itemName = req.getItemName() != null ? req.getItemName() : "Item";
        }

        return DietLogItem.builder()
                .dietLog(dietLog)
                .foodItemId(req.getFoodItemId())
                .itemName(itemName)
                .quantityG(quantity)
                .calories(itemMacros.calories())
                .protein(itemMacros.protein())
                .carb(itemMacros.carbs())
                .fat(itemMacros.fat())
                .source(food != null ? DietLogItemSource.DB : DietLogItemSource.USER_SELECTED)
                .build();
    }

    @Override
    public MacroNutrients macrosForFood(FoodItem food, BigDecimal quantityG) {
        BigDecimal serving = food.getServingSizeG() != null && food.getServingSizeG().compareTo(BigDecimal.ZERO) > 0
                ? food.getServingSizeG() : BigDecimal.valueOf(100);
        BigDecimal ratio = quantityG.divide(serving, 4, RoundingMode.HALF_UP);
        MacroNutrients macros = MacroNutrients.of(scale(food.getCalories(), ratio), scale(food.getProtein(), ratio), scale(food.getCarb(), ratio), scale(food.getFat(), ratio));
        return macros;
    }

    @Override
    public BigDecimal scale(BigDecimal value, BigDecimal ratio) {
        if (value == null) return MacroUtils.ZERO;
        return value.multiply(ratio).setScale(2, RoundingMode.HALF_UP);
    }

    @Override
    public void assignPtReviewerIfNeeded(DietLog dietLog, UUID customerId) {
        if (dietLog.getStatus() != DietLogStatus.PT_REVIEWING) return;
        findActivePt(customerId).ifPresent(mapping -> dietLog.setPtReviewer(mapping.getPt()));
    }

    @Override
    public Optional<PtClientMapping> findActivePt(UUID customerId) {
        return ptClientMappingRepository.findByClient_Id(customerId, PageRequest.of(0, 1))
                .getContent().stream()
                .filter(m -> m.getStatus() == ClientMappingStatus.ACTIVE)
                .findFirst();
    }

    @Override
    public void notifyPtOfNewLog(DietLog dietLog) {
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

    @Override
    public MealType parseMealType(String mealTypeStr) {
        if (mealTypeStr == null) return null;
        try {
            return MealType.valueOf(mealTypeStr);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public boolean shouldSuggestSos(MealSource mealSource, MealRecognitionResult aiResult, boolean hasDbMatch) {
        if (mealSource == MealSource.HOME_COOKED) return false;
        boolean isHighConfidence = !aiResult.isFallback()
                && aiResult.getConfidenceScore() != null
                && aiResult.getConfidenceScore().compareTo(confidenceThreshold) >= 0;
        return !isHighConfidence || !hasDbMatch;
    }

    @Override
    public DietLogResponse toResponse(DietLog dietLog) {
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

        String aiFoodCode = null;
        if (dietLog.getAiRawJson() != null && dietLog.getAiRawJson().get("foodCode") != null) {
            aiFoodCode = String.valueOf(dietLog.getAiRawJson().get("foodCode"));
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
                .matchedFoodName(dietLog.getMatchedFoodName())
                .aiFoodCode(aiFoodCode)
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
}


