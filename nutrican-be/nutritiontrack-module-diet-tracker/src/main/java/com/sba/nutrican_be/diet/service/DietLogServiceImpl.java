package com.sba.nutrican_be.diet.service;

import com.sba.nutrican_be.ai.MealRecognitionResult;
import com.sba.nutrican_be.ai.service.MealRecognitionService;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.core.entity.DietLog;
import com.sba.nutrican_be.core.entity.DietLogImage;
import com.sba.nutrican_be.core.entity.SOSTicket;
import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.core.enums.DietLogStatus;
import com.sba.nutrican_be.core.enums.MealType;
import com.sba.nutrican_be.core.enums.SOSTicketStatus;
import com.sba.nutrican_be.core.exception.BadRequestException;
import com.sba.nutrican_be.core.exception.ResourceNotFoundException;
import com.sba.nutrican_be.core.repository.DietLogImageRepository;
import com.sba.nutrican_be.core.repository.DietLogRepository;
import com.sba.nutrican_be.core.repository.SOSTicketRepository;
import com.sba.nutrican_be.core.repository.UserRepository;
import com.sba.nutrican_be.core.service.MinioService;
import com.sba.nutrican_be.core.util.MacroUtils;
import com.sba.nutrican_be.diet.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DietLogServiceImpl implements DietLogService {

    private final DietLogRepository dietLogRepository;
    private final DietLogImageRepository dietLogImageRepository;
    private final SOSTicketRepository sosTicketRepository;
    private final UserRepository userRepository;
    private final MealRecognitionService mealRecognitionService;
    private final MinioService minioService;

    @Override
    @Transactional
    public ApiResponse<DietLogResponse> createLog(UUID customerId, CreateDietLogRequest request) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", customerId));

        DietLog dietLog = DietLog.builder()
                .customer(customer)
                .mealType(request.getMealType())
                .foodDescription(request.getFoodDescription())
                .logDate(request.getLogDate() != null ? request.getLogDate() : LocalDate.now())
                .status(DietLogStatus.LOGGED)
                .build();

        if (request.getCalories() != null) {
            Map<String, Object> macros = MacroUtils.newMacroMap();
            macros.put("calories", request.getCalories());
            macros.put("protein", request.getProtein());
            macros.put("carbs", request.getCarb());
            macros.put("fat", request.getFat());
            dietLog.setMacrosJson(macros);
        }

        dietLog = dietLogRepository.save(dietLog);
        log.info("Diet log created: {} by user: {}", dietLog.getId(), customerId);
        return ApiResponse.success(toResponse(dietLog), "Diet log created");
    }

    @Override
    @Transactional
    public ApiResponse<AnalyzeMealResponse> analyzeMeal(UUID customerId, MultipartFile file, String mealTypeStr) {
        try {
            String objectName = minioService.uploadFile(file, "diet-logs/" + customerId);
            String imageUrl = minioService.getPresignedUrl(objectName);

            MealRecognitionResult aiResult = mealRecognitionService.recognizeMeal(imageUrl, mealTypeStr);

            User customer = userRepository.findById(customerId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", customerId));

            MealType mealType = null;
            if (mealTypeStr != null) {
                try {
                    mealType = MealType.valueOf(mealTypeStr);
                } catch (Exception e) {
                    // ignore
                }
            }

            Map<String, Object> macros = MacroUtils.newMacroMap();
            macros.put("calories", aiResult.getCalories());
            macros.put("protein", aiResult.getProtein());
            macros.put("carbs", aiResult.getCarbs());
            macros.put("fat", aiResult.getFat());

            DietLog dietLog = DietLog.builder()
                    .customer(customer)
                    .imageUrl(imageUrl)
                    .imageObjectName(objectName)
                    .mealType(mealType)
                    .foodDescription(aiResult.getFoodName())
                    .aiConfidenceScore(aiResult.getConfidenceScore())
                    .macrosJson(macros)
                    .status(aiResult.isFallback() ? DietLogStatus.DRAFT : DietLogStatus.PT_REVIEWING)
                    .logDate(LocalDate.now())
                    .build();

            dietLog = dietLogRepository.save(dietLog);
            log.info("Diet log created via AI: {} for user: {}, confidence: {}",
                    dietLog.getId(), customerId, aiResult.getConfidenceScore());

            AnalyzeMealResponse response = AnalyzeMealResponse.builder()
                    .logId(dietLog.getId())
                    .foodName(aiResult.getFoodName())
                    .portionSize(aiResult.getPortionSize())
                    .portionUnit(aiResult.getPortionUnit())
                    .calories(aiResult.getCalories())
                    .protein(aiResult.getProtein())
                    .carb(aiResult.getCarbs())
                    .fat(aiResult.getFat())
                    .confidenceScore(aiResult.getConfidenceScore())
                    .fallback(aiResult.isFallback())
                    .message(aiResult.getMessage())
                    .mealType(mealType)
                    .build();

            return ApiResponse.success(response,
                    aiResult.isFallback() ? "Low confidence, please verify" : "Meal analyzed successfully");
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

        if (startDate != null && endDate != null) {
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
    public ApiResponse<DietLogResponse> getLogById(UUID logId) {
        DietLog dietLog = dietLogRepository.findByIdWithCustomer(logId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", logId));
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

        for (DietLog dietLog : logs) {
            if (dietLog.getMacrosJson() != null) {
                totalCalories = MacroUtils.add(totalCalories, MacroUtils.getMacro(dietLog, "calories"));
                totalProtein = MacroUtils.add(totalProtein, MacroUtils.getMacro(dietLog, "protein"));
                totalCarb = MacroUtils.add(totalCarb, MacroUtils.getMacro(dietLog, "carbs"));
                totalFat = MacroUtils.add(totalFat, MacroUtils.getMacro(dietLog, "fat"));
            }
        }

        DietSummaryResponse summary = DietSummaryResponse.builder()
                .date(date)
                .totalCalories(totalCalories)
                .totalProtein(totalProtein)
                .totalCarbs(totalCarb)
                .totalFat(totalFat)
                .logs(logs.stream().map(this::toResponse).toList())
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
            dietLog.setSosTicketFlag(true);
            dietLogRepository.save(dietLog);
        }

        SOSTicket ticket = SOSTicket.builder()
                .dietLog(dietLog)
                .priority(request.getPriority() != null ? request.getPriority() : "HIGH")
                .note(request.getNote())
                .status(SOSTicketStatus.OPEN)
                .build();

        sosTicketRepository.save(ticket);
        log.info("SOS ticket created by user: {}", customerId);
        return ApiResponse.success(null, "SOS ticket created, your PT has been notified");
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
                .build();
    }
}
