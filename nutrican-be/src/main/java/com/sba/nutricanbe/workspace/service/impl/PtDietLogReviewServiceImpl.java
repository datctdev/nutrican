package com.sba.nutricanbe.workspace.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ForbiddenException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.util.MacroUtils;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.PtCorrectionReason;
import com.sba.nutricanbe.diet.enums.PtReviewAction;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.infrastructure.storage.StorageService;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.UserQueryService;
import com.sba.nutricanbe.workspace.dto.BlindEstimateRequest;
import com.sba.nutricanbe.workspace.dto.DietLogReviewResponse;
import com.sba.nutricanbe.workspace.dto.ReviewActionRequest;
import com.sba.nutricanbe.workspace.service.PtDietLogReviewService;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PtDietLogReviewServiceImpl implements PtDietLogReviewService {

    private final PtClientMappingRepository mappingRepository;
    private final DietLogRepository dietLogRepository;
    private final UserRepository userRepository;
    private final UserQueryService userQueryService;
    private final StorageService storageService;
    private final WebSocketSessionService webSocketSessionService;

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<DietLogReviewResponse>> getPendingLogs(UUID ptId, int page, int size, UUID clientId) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        List<UUID> clientIds;

        if (clientId != null) {
            boolean isActiveClient = mappingRepository.existsByPt_IdAndClient_IdAndStatusIn(
                    ptId, clientId, List.of(ClientMappingStatus.ACTIVE, ClientMappingStatus.END_REQUESTED));
            if (!isActiveClient) {
                throw new ForbiddenException("Bạn chỉ xem được bữa chờ duyệt của học viên đang được bạn huấn luyện");
            }
            clientIds = List.of(clientId);
        } else {
            clientIds = mappingRepository.findByPtIdWithClients(ptId).stream()
                    .filter(m -> m.getStatus() == ClientMappingStatus.ACTIVE
                            || m.getStatus() == ClientMappingStatus.END_REQUESTED)
                    .map(m -> m.getClient().getId())
                    .toList();
        }

        if (clientIds.isEmpty()) {
            return ApiResponse.success(PageResponse.from(Page.empty(pageable)));
        }

        return ApiResponse.success(pagePendingWithCalories(clientIds, page, size));
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<DietLogReviewResponse>> getClientDietLogs(
            UUID ptId, UUID clientId, int page, int size, DietLogReviewStatus reviewStatus) {
        if (!mappingRepository.existsByPt_IdAndClient_IdAndStatusIn(
                ptId, clientId, List.of(ClientMappingStatus.ACTIVE, ClientMappingStatus.END_REQUESTED))) {
            throw new ForbiddenException("Bạn chỉ xem được nhật ký của học viên đang được bạn huấn luyện");
        }

        if (reviewStatus == DietLogReviewStatus.PENDING) {
            return ApiResponse.success(pagePendingWithCalories(List.of(clientId), page, size));
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by("ptReviewedAt").descending()
                .and(Sort.by("createdAt").descending()));
        Page<DietLog> rawPage = dietLogRepository
                .findByCustomerIdInAndReviewStatus(List.of(clientId), reviewStatus, pageable);

        List<DietLogReviewResponse> content = rawPage.getContent().stream()
                .map(this::toReviewResponse)
                .toList();

        PageResponse<DietLogReviewResponse> response = PageResponse.<DietLogReviewResponse>builder()
                .content(content)
                .page(rawPage.getNumber())
                .size(rawPage.getSize())
                .totalElements(rawPage.getTotalElements())
                .totalPages(rawPage.getTotalPages())
                .last(rawPage.isLast())
                .build();

        return ApiResponse.success(response);
    }

    /**
     * PENDING chỉ hiện khi có calo — paginate ở DB (jsonb), mỗi page đủ size trừ trang cuối.
     */
    private PageResponse<DietLogReviewResponse> pagePendingWithCalories(
            List<UUID> clientIds, int page, int size) {
        int safeSize = Math.max(size, 1);
        int safePage = Math.max(page, 0);
        // Native query đã ORDER BY created_at DESC — Pageable unsorted tránh double-sort lỗi.
        Pageable pageable = PageRequest.of(safePage, safeSize);
        Page<DietLog> logPage = dietLogRepository.findPendingWithCaloriesByCustomerIds(
                clientIds, DietLogReviewStatus.PENDING.name(), pageable);
        List<DietLogReviewResponse> content = logPage.getContent().stream()
                .map(this::toReviewResponse)
                .toList();
        return PageResponse.<DietLogReviewResponse>builder()
                .content(content)
                .page(logPage.getNumber())
                .size(logPage.getSize())
                .totalElements(logPage.getTotalElements())
                .totalPages(logPage.getTotalPages())
                .first(logPage.isFirst())
                .last(logPage.isLast())
                .build();
    }

    @Override
    @Transactional
    public ApiResponse<DietLogReviewResponse> reviewLog(UUID logId, UUID ptId, ReviewActionRequest request) {
        DietLog dietLog = dietLogRepository.findByIdWithCustomer(logId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", logId));

        userRepository.findById(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT", ptId));

        if (!mappingRepository.existsByPt_IdAndClient_IdAndStatusIn(
                ptId, dietLog.getCustomerId(),
                List.of(ClientMappingStatus.ACTIVE, ClientMappingStatus.END_REQUESTED))) {
            throw new ForbiddenException("Bạn chỉ duyệt được bữa ăn của học viên đang được bạn huấn luyện");
        }

        if (dietLog.getReviewStatus() != DietLogReviewStatus.PENDING) {
            throw new BadRequestException("Chỉ duyệt bữa đang chờ xử lý");
        }

        dietLog.setPtReviewerId(ptId);
        dietLog.setMacrosAtReview(MacroUtils.copyMacroMap(dietLog.getMacrosJson()));
        PtCorrectionReason reason = request.getCorrectionReason() != null
                ? request.getCorrectionReason() : PtCorrectionReason.OTHER;
        dietLog.setPtCorrectionReason(reason);
        dietLog.setPtReviewedAt(LocalDateTime.now());

        switch (request.getAction().toUpperCase()) {
            case "APPROVE" -> {
                dietLog.setStatus(DietLogStatus.LOGGED);
                dietLog.setReviewStatus(DietLogReviewStatus.APPROVED);
                dietLog.setPtAction(PtReviewAction.APPROVE);
                dietLog.setPtAdjustedMacros(MacroUtils.copyMacroMap(dietLog.getMacrosAtReview()));
                if (request.getNote() != null) dietLog.setPtNote(request.getNote());
            }
            case "ADJUST", "ADJUST_MACROS" -> {
                dietLog.setStatus(DietLogStatus.LOGGED);
                dietLog.setReviewStatus(DietLogReviewStatus.APPROVED);
                dietLog.setPtAction(PtReviewAction.ADJUST);
                MacroNutrients adjusted = MacroUtils.buildAdjustedMacroMap(
                        request.getAdjustedCalories(),
                        request.getAdjustedProtein(),
                        request.getAdjustedCarb(),
                        request.getAdjustedFat()
                );
                dietLog.setMacrosJson(adjusted);
                dietLog.setPtAdjustedMacros(adjusted);
                dietLog.setPtNote(request.getNote());
            }
            case "REJECT" -> {
                dietLog.setStatus(DietLogStatus.LOGGED);
                dietLog.setReviewStatus(DietLogReviewStatus.REJECTED);
                dietLog.setPtAction(PtReviewAction.REJECT);
                dietLog.setPtAdjustedMacros(null);
                dietLog.setPtNote(request.getNote());
            }
            default -> throw new BadRequestException("Invalid action: " + request.getAction());
        }

        dietLog = dietLogRepository.save(dietLog);
        log.info("Diet log {} reviewed by PT {}: action={}", logId, ptId, request.getAction());

        notifyClientOfReview(dietLog.getCustomerId(), logId, dietLog.getReviewStatus().name());

        return ApiResponse.success(toReviewResponse(dietLog), "Log reviewed successfully");
    }

    @Override
    @Transactional
    public ApiResponse<DietLogReviewResponse> submitBlindEstimate(UUID logId, UUID ptId, BlindEstimateRequest request) {
        DietLog dietLog = dietLogRepository.findByIdWithCustomer(logId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", logId));
        if (!mappingRepository.existsByPt_IdAndClient_IdAndStatusIn(
                ptId, dietLog.getCustomerId(),
                List.of(ClientMappingStatus.ACTIVE, ClientMappingStatus.END_REQUESTED))) {
            throw new ForbiddenException("Bạn chỉ ước lượng macro cho học viên đang được bạn huấn luyện");
        }
        MacroNutrients blind = MacroUtils.buildAdjustedMacroMap(
                request.getCalories(), request.getProtein(), request.getCarb(), request.getFat());
        dietLog.setPtBlindMacros(blind);
        dietLog = dietLogRepository.save(dietLog);
        return ApiResponse.success(toReviewResponse(dietLog), "Blind estimate saved");
    }

    private DietLogReviewResponse toReviewResponse(DietLog log) {
        User customer = userQueryService.findUserById(log.getCustomerId()).orElse(null);
        String customerName = customer != null ? customer.getFullName() : null;
        String customerAvatar = customer != null ? customer.getAvatarUrl() : null;

        List<DietLogReviewResponse.AdditionalImageInfo> additionalImages = log.getAdditionalImages() == null
                ? null
                : log.getAdditionalImages().stream()
                        .map(img -> DietLogReviewResponse.AdditionalImageInfo.builder()
                                .id(img.getId())
                                .imageUrl(resolveImageUrl(img.getImageObjectName(), img.getImageUrl()))
                                .isPrimary(img.getIsPrimary())
                                .sortOrder(img.getSortOrder())
                                .build())
                        .toList();
        return DietLogReviewResponse.builder()
                .id(log.getId())
                .customerId(log.getCustomerId())
                .customerName(customerName)
                .customerAvatar(customerAvatar)
                .imageUrl(resolveImageUrl(log.getImageObjectName(), log.getImageUrl()))
                .mealType(log.getMealType())
                .foodDescription(log.getFoodDescription())
                .aiConfidenceScore(log.getAiConfidenceScore())
                .macrosJson(log.getMacrosJson())
                .status(log.getStatus())
                .reviewStatus(log.getReviewStatus())
                .logDate(log.getLogDate())
                .createdAt(log.getCreatedAt())
                .ptReviewedAt(log.getPtReviewedAt())
                .ptNote(log.getPtNote())
                .additionalImages(additionalImages)
                .mealSource(log.getMealSource())
                .mealComplexity(log.getMealComplexity())
                .restaurantName(log.getRestaurantName())
                .recognitionSource(log.getRecognitionSource())
                .aiRawJson(log.getAiRawJson())
                .aiPredictedMacros(log.getAiPredictedMacros())
                .dbMatchedMacros(log.getDbMatchedMacros())
                .macrosAtReview(log.getMacrosAtReview())
                .ptAdjustedMacros(log.getPtAdjustedMacros())
                .ptBlindMacros(log.getPtBlindMacros())
                .dbMatchScore(log.getDbMatchScore())
                .modelVersion(log.getModelVersion())
                .matchedFoodName(log.getMatchedFoodName())
                .experimentCohort(log.getExperimentCohort())
                .ptAction(log.getPtAction())
                .ptCorrectionReason(log.getPtCorrectionReason())
                .blindSubmitted(log.getPtBlindMacros() != null)
                .lateTickReason(log.getLateTickReason())
                .mealPeriod(log.getMealPeriod() != null ? log.getMealPeriod().name() : null)
                .build();
    }

    private String resolveImageUrl(String objectName, String storedUrl) {
        if (objectName != null && !objectName.isBlank()) {
            String refreshedUrl = storageService.getPresignedUrl(objectName);
            return refreshedUrl != null ? refreshedUrl : storedUrl;
        }
        return storedUrl;
    }

    private void notifyClientOfReview(UUID clientId, UUID logId, String status) {
        log.info("Notifying client {} about review of log {}: status={}", clientId, logId, status);
        Map<String, Object> payload = new HashMap<>();
        payload.put("logId", logId);
        payload.put("status", status);
        webSocketSessionService.sendToUser(clientId, "DIET_LOG_REVIEWED", payload);
    }
}
