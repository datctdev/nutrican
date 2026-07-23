package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.diet.service.DietLogHelper;

import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.DietLogItem;
import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.diet.enums.DietLogItemSource;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.common.event.DietLogCreatedEvent;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.util.MacroUtils;
import com.sba.nutricanbe.diet.dto.request.DietLogItemRequest;
import com.sba.nutricanbe.diet.dto.response.DietLogImageDto;
import com.sba.nutricanbe.diet.dto.response.DietLogItemResponse;
import com.sba.nutricanbe.diet.dto.response.DietLogResponse;
import com.sba.nutricanbe.diet.dto.response.FoodItemResponse;
import com.sba.nutricanbe.diet.service.FoodCatalogService;
import com.sba.nutricanbe.infrastructure.storage.StorageService;
import com.sba.nutricanbe.user.service.UserQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import com.sba.nutricanbe.common.dto.MacroNutrients;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class DietLogHelperImpl implements DietLogHelper {

    private static final int MAX_CUSTOM_ITEM_NAME_LEN = 120;
    private static final BigDecimal MAX_QTY_G = BigDecimal.valueOf(5000);
    private static final BigDecimal MAX_MACRO = BigDecimal.valueOf(20_000);

    private final FoodItemRepository foodItemRepository;
    private final PtClientMappingRepository ptClientMappingRepository;
    private final FoodCatalogService foodCatalogService;
    private final ApplicationEventPublisher eventPublisher;
    private final UserQueryService userQueryService;
    private final StorageService minioService;

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
        BigDecimal quantity = sanitizeQuantity(req.getQuantityG());
        MacroNutrients itemMacros;
        String itemName;
        UUID resolvedFoodItemId;

        if (food != null) {
            itemMacros = macrosForFood(food, quantity);
            itemName = food.getNameVi();
            resolvedFoodItemId = food.getId();
        } else {
            itemName = sanitizeCustomItemName(req.getItemName());
            itemMacros = MacroNutrients.of(
                    sanitizeMacro(req.getCalories()),
                    sanitizeMacro(req.getProtein()),
                    sanitizeMacro(req.getCarb()),
                    sanitizeMacro(req.getFat()));
            resolvedFoodItemId = null;
        }

        return DietLogItem.builder()
                .dietLog(dietLog)
                .foodItemId(resolvedFoodItemId)
                .itemName(itemName)
                .quantityG(quantity)
                .calories(itemMacros.calories())
                .protein(itemMacros.protein())
                .carb(itemMacros.carbs())
                .fat(itemMacros.fat())
                .source(food != null ? DietLogItemSource.DB : DietLogItemSource.USER_SELECTED)
                .build();
    }

    private static String sanitizeCustomItemName(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BadRequestException("Món tùy chỉnh cần tên món (itemName)");
        }
        String trimmed = raw.trim().replaceAll("\\s+", " ");
        if (trimmed.length() > MAX_CUSTOM_ITEM_NAME_LEN) {
            trimmed = trimmed.substring(0, MAX_CUSTOM_ITEM_NAME_LEN);
        }
        return trimmed;
    }

    private static BigDecimal sanitizeQuantity(BigDecimal qty) {
        BigDecimal value = qty != null ? qty : BigDecimal.valueOf(100);
        if (value.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("quantityG must be positive");
        }
        if (value.compareTo(MAX_QTY_G) > 0) {
            return MAX_QTY_G;
        }
        return value;
    }

    private static BigDecimal sanitizeMacro(BigDecimal value) {
        if (value == null) {
            return MacroUtils.ZERO;
        }
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            return MacroUtils.ZERO;
        }
        if (value.compareTo(MAX_MACRO) > 0) {
            return MAX_MACRO;
        }
        return value;
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
    public DietLogReviewStatus resolveReviewStatus(UUID customerId, boolean sendToPt) {
        if (sendToPt && hasActivePt(customerId)) {
            return DietLogReviewStatus.PENDING;
        }
        return DietLogReviewStatus.NOT_REQUIRED;
    }

    @Override
    public boolean hasActivePt(UUID customerId) {
        return ptClientMappingRepository.existsByClient_IdAndStatusIn(
                customerId,
                List.of(ClientMappingStatus.ACTIVE, ClientMappingStatus.END_REQUESTED));
    }

    @Override
    public void assignPtReviewerIfNeeded(DietLog dietLog, UUID customerId) {
        if (dietLog.getReviewStatus() != DietLogReviewStatus.PENDING) return;
        findActivePt(customerId).ifPresent(mapping -> dietLog.setPtReviewerId(mapping.getPt().getId()));
    }

    @Override
    public Optional<PtClientMapping> findActivePt(UUID customerId) {
        return ptClientMappingRepository.findFirstByClient_IdAndStatusIn(
                customerId,
                List.of(ClientMappingStatus.ACTIVE, ClientMappingStatus.END_REQUESTED));
    }

    @Override
    public void notifyPtOfNewLog(DietLog dietLog) {
        if (dietLog.getReviewStatus() != DietLogReviewStatus.PENDING) return;
        UUID ptId = dietLog.getPtReviewerId();
        if (ptId == null) {
            ptId = findActivePt(dietLog.getCustomerId()).map(m -> m.getPt().getId()).orElse(null);
        }
        if (ptId == null) return;
        String customerName = userQueryService.findUserById(dietLog.getCustomerId())
                .map(User::getFullName)
                .orElse("");
        eventPublisher.publishEvent(new DietLogCreatedEvent(
                this,
                ptId,
                dietLog.getCustomerId(),
                customerName,
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
    public DietLogResponse toResponse(DietLog dietLog) {
        List<DietLogImageDto> additionalImages = null;
        if (dietLog.getAdditionalImages() != null && !dietLog.getAdditionalImages().isEmpty()) {
            additionalImages = dietLog.getAdditionalImages().stream()
                    .map(img -> DietLogImageDto.builder()
                            .id(img.getId())
                            .dietLogId(dietLog.getId())
                            .imageUrl(resolveImageUrl(img.getImageObjectName(), img.getImageUrl()))
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
            try {
                aiFoodCode = String.valueOf(dietLog.getAiRawJson().get("foodCode"));
            } catch (Exception ignored) {
                aiFoodCode = null;
            }
        }

        BigDecimal totalGrams = null;
        try {
            if (items != null && !items.isEmpty()) {
                BigDecimal sum = BigDecimal.ZERO;
                boolean any = false;
                for (DietLogItemResponse item : items) {
                    if (item.getQuantityG() != null) {
                        sum = sum.add(item.getQuantityG());
                        any = true;
                    }
                }
                if (any) {
                    totalGrams = sum;
                }
            }
            if (totalGrams == null && dietLog.getAiRawJson() != null) {
                Object raw = dietLog.getAiRawJson().get("userAdjustedGrams");
                if (raw == null) {
                    raw = dietLog.getAiRawJson().get("portionSize");
                }
                if (raw != null) {
                    if (raw instanceof Number n) {
                        totalGrams = BigDecimal.valueOf(n.doubleValue());
                    } else {
                        String s = String.valueOf(raw).trim();
                        if (!s.isEmpty() && !"null".equalsIgnoreCase(s)) {
                            totalGrams = new BigDecimal(s);
                        }
                    }
                    if (totalGrams != null && totalGrams.compareTo(BigDecimal.ZERO) <= 0) {
                        totalGrams = null;
                    }
                }
            }
        } catch (Exception ignored) {
            totalGrams = null;
        }

        String customerName = userQueryService.findUserById(dietLog.getCustomerId())
                .map(User::getFullName)
                .orElse(null);

        return DietLogResponse.builder()
                .id(dietLog.getId())
                .customerId(dietLog.getCustomerId())
                .customerName(customerName)
                .imageUrl(resolveImageUrl(dietLog.getImageObjectName(), dietLog.getImageUrl()))
                .aiConfidenceScore(dietLog.getAiConfidenceScore())
                .macrosJson(dietLog.getMacrosJson())
                .mealType(dietLog.getMealType())
                .mealPeriod(dietLog.getMealPeriod())
                .makeupForPeriod(dietLog.getMakeupForPeriod())
                .status(dietLog.getStatus())
                .reviewStatus(dietLog.getReviewStatus())
                .foodDescription(dietLog.getFoodDescription())
                .matchedFoodName(dietLog.getMatchedFoodName())
                .aiFoodCode(aiFoodCode)
                .ptReviewerId(dietLog.getPtReviewerId())
                .ptNote(dietLog.getPtNote())
                .ptCorrectionReason(dietLog.getPtCorrectionReason())
                .logDate(dietLog.getLogDate())
                .lateTickReason(dietLog.getLateTickReason())
                .createdAt(dietLog.getCreatedAt())
                .additionalImages(additionalImages)
                .mealSource(dietLog.getMealSource())
                .mealComplexity(dietLog.getMealComplexity())
                .restaurantName(dietLog.getRestaurantName())
                .recognitionSource(dietLog.getRecognitionSource())
                .foodItemId(dietLog.getFoodItemId())
                .suggestedFoodMatches(suggestedMatches)
                .items(items)
                .totalGrams(totalGrams)
                .build();
    }


    private String resolveImageUrl(String objectName, String storedUrl) {
        if (objectName != null && !objectName.isBlank()) {
            return minioService.getPresignedUrl(objectName);
        }
        return storedUrl;
    }
}


